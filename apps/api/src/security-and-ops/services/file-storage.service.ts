import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Minio from 'minio';
import { randomUUID } from 'crypto';
import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';

@Injectable()
export class FileStorageService implements OnModuleInit {
  private readonly logger = new Logger(FileStorageService.name);
  private client!: Minio.Client;
  private cadBucket!: string;
  private backupBucket!: string;
  private minioAvailable = false;
  private localStorageRoot!: string;

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
    this.localStorageRoot = join(process.cwd(), '.local-storage');

    await this.ensureBucket(this.cadBucket);
    await this.ensureBucket(this.backupBucket);

    if (!this.minioAvailable) {
      await mkdir(join(this.localStorageRoot, this.cadBucket), { recursive: true });
      await mkdir(join(this.localStorageRoot, this.backupBucket), { recursive: true });
      this.logger.warn(
        'MinIO unavailable — using local .local-storage fallback for CAD/backup files',
      );
    }
  }

  private async ensureBucket(bucket: string) {
    try {
      const exists = await this.client.bucketExists(bucket);
      if (!exists) {
        await this.client.makeBucket(bucket);
        this.logger.log(`Created MinIO bucket: ${bucket}`);
      }
      this.minioAvailable = true;
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

    if (this.minioAvailable) {
      await this.client.putObject(
        this.cadBucket,
        objectName,
        file.buffer,
        file.size,
        { 'Content-Type': file.mimetype },
      );
    } else {
      const fullPath = join(this.localStorageRoot, this.cadBucket, objectName);
      await mkdir(join(fullPath, '..'), { recursive: true });
      await writeFile(fullPath, file.buffer);
    }

    return `${this.cadBucket}/${objectName}`;
  }

  async uploadBackup(objectName: string, data: Buffer): Promise<string> {
    if (this.minioAvailable) {
      await this.client.putObject(this.backupBucket, objectName, data, data.length, {
        'Content-Type': 'application/octet-stream',
      });
    } else {
      const fullPath = join(this.localStorageRoot, this.backupBucket, objectName);
      await mkdir(join(fullPath, '..'), { recursive: true });
      await writeFile(fullPath, data);
    }
    return `${this.backupBucket}/${objectName}`;
  }

  async getPresignedUrl(objectKey: string, expirySeconds = 3600): Promise<string> {
    if (!this.minioAvailable) {
      return `file://${join(this.localStorageRoot, objectKey)}`;
    }
    const [bucket, ...rest] = objectKey.split('/');
    const objectName = rest.join('/');
    return this.client.presignedGetObject(bucket, objectName, expirySeconds);
  }

  async getFile(objectKey: string): Promise<{
    buffer: Buffer;
    contentType: string;
    fileName: string;
    size: number;
  }> {
    const meta = await this.statFile(objectKey);
    if (meta.size === 0) {
      return { buffer: Buffer.alloc(0), contentType: meta.contentType, fileName: meta.fileName, size: 0 };
    }
    const buffer = await this.getFilePart(objectKey, 0, meta.size - 1);
    return { buffer, contentType: meta.contentType, fileName: meta.fileName, size: meta.size };
  }

  async statFile(objectKey: string): Promise<{
    size: number;
    contentType: string;
    fileName: string;
  }> {
    const fileName = objectKey.split('/').pop() ?? 'drawing';
    const contentType = this.resolveContentType(fileName);

    if (this.minioAvailable) {
      try {
        const [bucket, ...rest] = objectKey.split('/');
        const objectName = rest.join('/');
        const stat = await this.client.statObject(bucket, objectName);
        return { size: stat.size, contentType, fileName };
      } catch (error) {
        if (this.isMissingObjectError(error)) {
          return this.statLocalFile(objectKey, contentType, fileName);
        }
        throw error;
      }
    }

    return this.statLocalFile(objectKey, contentType, fileName);
  }

  async getFilePart(
    objectKey: string,
    start: number,
    end: number,
  ): Promise<Buffer> {
    const length = end - start + 1;
    if (length <= 0) {
      return Buffer.alloc(0);
    }

    if (this.minioAvailable) {
      try {
        const [bucket, ...rest] = objectKey.split('/');
        const objectName = rest.join('/');
        const stream = await this.client.getPartialObject(
          bucket,
          objectName,
          start,
          length,
        );
        const chunks: Buffer[] = [];
        for await (const chunk of stream) {
          chunks.push(Buffer.from(chunk));
        }
        return Buffer.concat(chunks);
      } catch (error) {
        if (this.isMissingObjectError(error)) {
          return this.readLocalFilePart(objectKey, start, end);
        }
        throw error;
      }
    }

    return this.readLocalFilePart(objectKey, start, end);
  }

  private async statLocalFile(
    objectKey: string,
    contentType: string,
    fileName: string,
  ) {
    const { stat } = await import('fs/promises');
    const fullPath = join(this.localStorageRoot, objectKey);
    const fileStat = await stat(fullPath);
    return { size: fileStat.size, contentType, fileName };
  }

  private async readLocalFilePart(
    objectKey: string,
    start: number,
    end: number,
  ) {
    const { open } = await import('fs/promises');
    const fullPath = join(this.localStorageRoot, objectKey);
    const length = end - start + 1;
    const handle = await open(fullPath, 'r');
    try {
      const buffer = Buffer.alloc(length);
      await handle.read(buffer, 0, length, start);
      return buffer;
    } finally {
      await handle.close();
    }
  }

  private isMissingObjectError(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code: string }).code === 'NoSuchKey'
    );
  }

  private resolveContentType(fileName: string): string {
    const ext = fileName.split('.').pop()?.toLowerCase();
    const map: Record<string, string> = {
      pdf: 'application/pdf',
      dwg: 'application/acad',
      dxf: 'application/dxf',
      rvt: 'application/octet-stream',
      ifc: 'application/octet-stream',
    };
    return map[ext ?? ''] ?? 'application/octet-stream';
  }
}
