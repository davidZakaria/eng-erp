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

export interface MultipartPartResponse {
  PartNumber?: number;
  Size?: number;
  ETag?: string;
}
