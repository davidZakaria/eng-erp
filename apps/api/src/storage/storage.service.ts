import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AbortMultipartUploadCommand,
  CompleteMultipartUploadCommand,
  CreateBucketCommand,
  CreateMultipartUploadCommand,
  HeadBucketCommand,
  ListPartsCommand,
  PutObjectCommand,
  S3Client,
  UploadPartCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';

@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);
  /** Internal MinIO — create/complete/list/abort multipart. */
  private internalClient!: S3Client;
  /** Public URL the browser uses — must match presigned host/path for signature validation. */
  private presignClient!: S3Client;
  private bucket!: string;

  constructor(private configService: ConfigService) {}

  private buildClient(endpoint: string): S3Client {
    return new S3Client({
      region: 'us-east-1',
      endpoint,
      forcePathStyle: true,
      credentials: {
        accessKeyId:
          this.configService.get<string>('S3_ACCESS_KEY') ?? 'admin',
        secretAccessKey:
          this.configService.get<string>('S3_SECRET_KEY') ?? 'password123',
      },
    });
  }

  async onModuleInit() {
    const internalEndpoint =
      this.configService.get<string>('S3_ENDPOINT') ?? 'http://minio:9000';
    const publicEndpoint = this.configService
      .get<string>('S3_PUBLIC_ENDPOINT')
      ?.replace(/\/$/, '');

    this.bucket =
      this.configService.get<string>('S3_BUCKET_NAME') ?? 'eng-njd-documents';

    this.internalClient = this.buildClient(internalEndpoint);
    this.presignClient = publicEndpoint
      ? this.buildClient(publicEndpoint)
      : this.internalClient;

    if (publicEndpoint) {
      this.logger.log(
        `Browser uploads presigned against ${publicEndpoint} (internal ${internalEndpoint})`,
      );
    }

    await this.ensureBucket();
  }

  private buildFileKey(fileName: string) {
    const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    return `drawings/${Date.now()}-${randomUUID()}-${safeName}`;
  }

  private async ensureBucket() {
    try {
      await this.internalClient.send(
        new HeadBucketCommand({ Bucket: this.bucket }),
      );
    } catch {
      try {
        await this.internalClient.send(
          new CreateBucketCommand({ Bucket: this.bucket }),
        );
        this.logger.log(`Created S3 bucket: ${this.bucket}`);
      } catch (error) {
        this.logger.warn(`Could not ensure bucket ${this.bucket}: ${error}`);
      }
    }
  }

  async generateUploadUrl(fileName: string, contentType: string) {
    const fileKey = this.buildFileKey(fileName);

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: fileKey,
      ContentType: contentType,
    });

    const presignedUrl = await getSignedUrl(this.presignClient, command, {
      expiresIn: 15 * 60,
    });

    return {
      presignedUrl,
      fileKey,
      fileUrl: `${this.bucket}/${fileKey}`,
    };
  }

  async createMultipartUpload(fileName: string, contentType: string) {
    const key = this.buildFileKey(fileName);

    const result = await this.internalClient.send(
      new CreateMultipartUploadCommand({
        Bucket: this.bucket,
        Key: key,
        ContentType: contentType,
      }),
    );

    if (!result.UploadId) {
      throw new Error('Failed to initiate multipart upload');
    }

    return {
      uploadId: result.UploadId,
      key,
      fileKey: key,
      fileUrl: `${this.bucket}/${key}`,
    };
  }

  async signPartUpload(key: string, uploadId: string, partNumber: number) {
    const command = new UploadPartCommand({
      Bucket: this.bucket,
      Key: key,
      UploadId: uploadId,
      PartNumber: partNumber,
    });

    const url = await getSignedUrl(this.presignClient, command, {
      expiresIn: 15 * 60,
    });

    return { url };
  }

  /** Upload one multipart part via the internal MinIO client (browser uses API proxy). */
  async uploadPartBody(
    key: string,
    uploadId: string,
    partNumber: number,
    body: Buffer,
  ) {
    const result = await this.internalClient.send(
      new UploadPartCommand({
        Bucket: this.bucket,
        Key: key,
        UploadId: uploadId,
        PartNumber: partNumber,
        Body: body,
      }),
    );

    if (!result.ETag) {
      throw new Error('Upload part did not return ETag');
    }

    return { ETag: result.ETag };
  }

  async listMultipartParts(key: string, uploadId: string) {
    const result = await this.internalClient.send(
      new ListPartsCommand({
        Bucket: this.bucket,
        Key: key,
        UploadId: uploadId,
      }),
    );

    return (result.Parts ?? []).map((part) => ({
      PartNumber: part.PartNumber,
      Size: part.Size,
      ETag: part.ETag,
    }));
  }

  async completeMultipartUpload(
    key: string,
    uploadId: string,
    parts: { PartNumber: number; ETag: string }[],
  ) {
    await this.internalClient.send(
      new CompleteMultipartUploadCommand({
        Bucket: this.bucket,
        Key: key,
        UploadId: uploadId,
        MultipartUpload: {
          Parts: parts.sort((a, b) => a.PartNumber - b.PartNumber),
        },
      }),
    );

    return {
      key,
      fileKey: key,
      fileUrl: `${this.bucket}/${key}`,
    };
  }

  async abortMultipartUpload(key: string, uploadId: string) {
    await this.internalClient.send(
      new AbortMultipartUploadCommand({
        Bucket: this.bucket,
        Key: key,
        UploadId: uploadId,
      }),
    );

    return { aborted: true };
  }
}
