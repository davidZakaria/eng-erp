import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { createCipheriv, randomBytes } from 'crypto';
import { gzipSync } from 'zlib';
import { FileStorageService } from '../security-and-ops/services/file-storage.service';
import { PrismaService } from '../prisma/prisma.module';

const execFileAsync = promisify(execFile);

@Injectable()
export class BackupsService {
  private readonly logger = new Logger(BackupsService.name);

  constructor(
    private configService: ConfigService,
    private fileStorage: FileStorageService,
    private prisma: PrismaService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async handleDailyBackup() {
    this.logger.log('Starting scheduled daily database backup...');
    await this.runBackup('SCHEDULED');
  }

  findAll() {
    return this.prisma.systemBackup.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async triggerManual() {
    return this.runBackup('MANUAL');
  }

  async getDownloadUrl(id: string) {
    const backup = await this.prisma.systemBackup.findUnique({ where: { id } });
    if (!backup) {
      throw new NotFoundException('Backup not found');
    }

    const url = await this.fileStorage.getPresignedUrl(backup.fileUrl, 3600);
    return { id: backup.id, fileName: backup.fileName, downloadUrl: url };
  }

  private async runBackup(trigger: 'SCHEDULED' | 'MANUAL') {
    try {
      const databaseUrl = this.configService.get<string>('DATABASE_URL');
      if (!databaseUrl) {
        throw new Error('DATABASE_URL is not configured');
      }

      const pgDumpPath =
        this.configService.get<string>('PG_DUMP_PATH') ?? 'pg_dump';
      const { stdout } = await execFileAsync(pgDumpPath, [databaseUrl], {
        maxBuffer: 1024 * 1024 * 100,
      });

      const compressed = gzipSync(Buffer.from(stdout, 'utf8'));
      const payload = this.maybeEncrypt(compressed);

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `pg-backup-${timestamp}.sql.gz${
        this.hasEncryptionKey() ? '.enc' : ''
      }`;
      const fileUrl = await this.fileStorage.uploadBackup(fileName, payload);

      const record = await this.prisma.systemBackup.create({
        data: {
          fileName,
          fileUrl,
          fileSize: payload.length,
          status: 'SUCCESS',
        },
      });

      this.logger.log(`${trigger} backup saved: ${fileUrl}`);
      return record;
    } catch (error) {
      this.logger.error(`${trigger} backup failed: ${error}`);

      const failed = await this.prisma.systemBackup.create({
        data: {
          fileName: `failed-${Date.now()}.sql.gz`,
          fileUrl: '',
          fileSize: 0,
          status: 'FAILED',
        },
      });

      return failed;
    }
  }

  private hasEncryptionKey() {
    const keyHex = this.configService.get<string>('BACKUP_ENCRYPTION_KEY');
    return !!keyHex && keyHex.length === 64;
  }

  private maybeEncrypt(data: Buffer): Buffer {
    if (!this.hasEncryptionKey()) {
      return data;
    }

    const keyHex = this.configService.get<string>('BACKUP_ENCRYPTION_KEY')!;
    const key = Buffer.from(keyHex, 'hex');
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', key, iv);
    const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return Buffer.concat([iv, authTag, encrypted]);
  }
}
