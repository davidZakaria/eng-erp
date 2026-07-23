import { Discipline } from '@/lib/types';

export const DRAWING_DISCIPLINES: Discipline[] = [
  'ARCHITECTURAL',
  'STRUCTURAL',
  'MEP',
  'INFRASTRUCTURE',
];

export function contentTypeForFileName(fileName: string, fallbackType?: string): string {
  const name = fileName.toLowerCase();
  if (name.endsWith('.pdf')) return 'application/pdf';
  if (name.endsWith('.dwg')) return 'application/acad';
  if (name.endsWith('.dxf')) return 'application/dxf';
  return fallbackType || 'application/octet-stream';
}

export interface PresignedUploadResponse {
  presignedUrl: string;
  fileKey: string;
  fileUrl: string;
}

export interface MultipartCreateResponse {
  uploadId: string;
  key: string;
  fileKey: string;
  fileUrl: string;
}

export interface SignPartResponse {
  url: string;
}

/** Same-origin proxy URL so multipart parts upload via API → MinIO (no browser CORS). */
export function proxyMultipartUploadPartUrl(
  key: string,
  uploadId: string,
  partNumber: number,
): string {
  const query = new URLSearchParams({
    key,
    uploadId,
    partNumber: String(partNumber),
  });
  const apiPath = `/storage/multipart/upload-part?${query.toString()}`;
  return `/api/proxy?path=${encodeURIComponent(apiPath)}`;
}

export interface MultipartPartResponse {
  PartNumber?: number;
  Size?: number;
  ETag?: string;
}
