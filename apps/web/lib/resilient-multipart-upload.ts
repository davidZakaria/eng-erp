import { clientApi } from '@/lib/client-api';
import {
  contentTypeForFileName,
  MultipartCreateResponse,
} from '@/lib/drawing-upload';

const RETRY_DELAYS_MS = [0, 1000, 3000, 5000];
const MIN_PART_BYTES = 5 * 1024 * 1024;
const MAX_PARTS = 10_000;

export interface MultipartUploadCallbacks {
  onProgress?: (uploaded: number, total: number) => void;
  onRetry?: () => void;
}

export interface MultipartUploadResult {
  fileUrl: string;
  fileKey: string;
}

function partSizeForFile(fileSize: number): number {
  let chunkSize = Math.max(MIN_PART_BYTES, Math.ceil(fileSize / MAX_PARTS));
  if (Math.ceil(fileSize / chunkSize) > MAX_PARTS) {
    chunkSize = Math.ceil(fileSize / MAX_PARTS);
  }
  return chunkSize;
}

async function proxyApiPut(
  path: string,
  body: Blob,
  signal?: AbortSignal,
): Promise<string> {
  const url = `/api/proxy?path=${encodeURIComponent(path)}`;
  const res = await fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/octet-stream' },
    body,
    credentials: 'same-origin',
    signal,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    const message =
      typeof error.message === 'string'
        ? error.message
        : Array.isArray(error.message)
          ? error.message.join(', ')
          : `Upload part failed (${res.status})`;
    throw new Error(message);
  }

  const etag = res.headers.get('etag');
  if (!etag) {
    throw new Error('Upload part succeeded but ETag header is missing');
  }

  return etag;
}

async function uploadPartWithRetry(
  path: string,
  chunk: Blob,
  callbacks: MultipartUploadCallbacks,
  signal?: AbortSignal,
): Promise<string> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt < RETRY_DELAYS_MS.length; attempt++) {
    if (attempt > 0) {
      callbacks.onRetry?.();
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAYS_MS[attempt]));
    }

    signal?.throwIfAborted();

    try {
      return await proxyApiPut(path, chunk, signal);
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
    }
  }

  throw lastError ?? new Error('Upload part failed');
}

/** Sequential multipart upload: browser → Next proxy → API → MinIO. */
export async function uploadDrawingFileMultipart(
  file: File,
  callbacks: MultipartUploadCallbacks = {},
  signal?: AbortSignal,
): Promise<MultipartUploadResult> {
  const contentType = contentTypeForFileName(file.name, file.type);
  const createData = await clientApi<MultipartCreateResponse>(
    '/storage/multipart/create',
    {
      method: 'POST',
      body: JSON.stringify({ fileName: file.name, contentType }),
      signal,
    },
  );

  const { uploadId, key, fileUrl, fileKey } = createData;
  const parts: { PartNumber: number; ETag: string }[] = [];
  const chunkSize = partSizeForFile(file.size);
  let partNumber = 0;

  try {
    for (let offset = 0; offset < file.size; ) {
      partNumber += 1;
      const end = Math.min(offset + chunkSize, file.size);
      const chunk = file.slice(offset, end);
      offset = end;

      const query = new URLSearchParams({
        key,
        uploadId,
        partNumber: String(partNumber),
      });
      const path = `/storage/multipart/upload-part?${query.toString()}`;

      const etag = await uploadPartWithRetry(path, chunk, callbacks, signal);
      parts.push({ PartNumber: partNumber, ETag: etag });
      callbacks.onProgress?.(offset, file.size);
    }

    const completeData = await clientApi<MultipartUploadResult>(
      '/storage/multipart/complete',
      {
        method: 'POST',
        body: JSON.stringify({ key, uploadId, parts }),
        signal,
      },
    );

    return {
      fileUrl: completeData.fileUrl ?? fileUrl,
      fileKey: completeData.fileKey ?? fileKey,
    };
  } catch (err) {
    await clientApi('/storage/multipart/abort', {
      method: 'POST',
      body: JSON.stringify({ key, uploadId }),
    }).catch(() => undefined);
    throw err;
  }
}
