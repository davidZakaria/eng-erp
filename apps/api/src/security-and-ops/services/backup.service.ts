import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { createCipheriv, randomBytes } from 'crypto';
import { gzipSync } from 'zlib';
import { FileStorageService } from './file-storage.service';

const execFileAsync = promisify(execFile);

@Injectable()
export class BackupService {
  private readonly logger = new Logger(BackupService.name);

  constructor(
    private configService: ConfigService,
    private fileStorage: FileStorageService,
  ) {}

  @Cron('0 2 * * *')
  async handleDailyBackup() {
    this.logger.log('Starting daily encrypted database backup...');

    try {
      const databaseUrl = this.configService.get<string>('DATABASE_URL');
      if (!databaseUrl) {
        throw new Error('DATABASE_URL is not configured');
      }

      const pgDumpPath = this.configService.get<string>('PG_DUMP_PATH') ?? 'pg_dump';
      const { stdout } = await execFileAsync(pgDumpPath, [databaseUrl], {
        maxBuffer: 1024 * 1024 * 100,
      });

      const compressed = gzipSync(Buffer.from(stdout, 'utf8'));
      const encrypted = this.encrypt(compressed);

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const objectName = `pg-backup-${timestamp}.enc`;

      const location = await this.fileStorage.uploadBackup(objectName, encrypted);
      this.logger.log(`Backup uploaded successfully: ${location}`);
    } catch (error) {
      this.logger.error(`Daily backup failed: ${error}`);
    }
  }

  private encrypt(data: Buffer): Buffer {
    const keyHex = this.configService.get<string>('BACKUP_ENCRYPTION_KEY');
    if (!keyHex || keyHex.length !== 64) {
      throw new Error('BACKUP_ENCRYPTION_KEY must be a 64-char hex string (32 bytes)');
    }

    const key = Buffer.from(keyHex, 'hex');
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', key, iv);

    const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
    const authTag = cipher.getAuthTag();

    return Buffer.concat([iv, authTag, encrypted]);
  }
}
