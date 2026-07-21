import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Minio from 'minio';
import { randomUUID } from 'crypto';

@Injectable()
export class FileStorageService implements OnModuleInit {
  private readonly logger = new Logger(FileStorageService.name);
  private client!: Minio.Client;
  private cadBucket!: string;
  private backupBucket!: string;

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    const endpoint = this.configService.get<string>('MINIO_ENDPOINT') ?? 'localhost';
    const port = Number(this.configService.get<string>('MINIO_PORT') ?? 9000);
    const useSSL = this.configService.get<string>('MINIO_USE_SSL') === 'true';

    this.client = new Minio.Client({
      endPoint: endpoint,
      port,
      useSSL,
      accessKey: this.configService.get<string>('MINIO_ACCESS_KEY') ?? 'minioadmin',
      secretKey: this.configService.get<string>('MINIO_SECRET_KEY') ?? 'minioadmin123',
    });

    this.cadBucket = this.configService.get<string>('MINIO_CAD_BUCKET') ?? 'cad-files';
    this.backupBucket = this.configService.get<string>('MINIO_BACKUP_BUCKET') ?? 'backups';

    await this.ensureBucket(this.cadBucket);
    await this.ensureBucket(this.backupBucket);
  }

  private async ensureBucket(bucket: string) {
    try {
      const exists = await this.client.bucketExists(bucket);
      if (!exists) {
        await this.client.makeBucket(bucket);
        this.logger.log(`Created MinIO bucket: ${bucket}`);
      }
    } catch (error) {
      this.logger.warn(`MinIO bucket check failed for ${bucket}: ${error}`);
    }
  }

  async uploadCadFile(
    file: Express.Multer.File,
    projectId: string,
    title: string,
  ): Promise<string> {
    const sanitizedTitle = title.replace(/[^a-zA-Z0-9._-]/g, '_');
    const objectName = `${projectId}/${sanitizedTitle}/v${Date.now()}-${randomUUID()}-${file.originalname}`;

    await this.client.putObject(
      this.cadBucket,
      objectName,
      file.buffer,
      file.size,
      { 'Content-Type': file.mimetype },
    );

    return `${this.cadBucket}/${objectName}`;
  }

  async uploadBackup(objectName: string, data: Buffer): Promise<string> {
    await this.client.putObject(this.backupBucket, objectName, data, data.length, {
      'Content-Type': 'application/octet-stream',
    });
    return `${this.backupBucket}/${objectName}`;
  }

  async getPresignedUrl(objectKey: string, expirySeconds = 3600): Promise<string> {
    const [bucket, ...rest] = objectKey.split('/');
    const objectName = rest.join('/');
    return this.client.presignedGetObject(bucket, objectName, expirySeconds);
  }
}
