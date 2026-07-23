export type TransferPhase = 'idle' | 'active' | 'retrying' | 'error' | 'done';

const RETRY_DELAYS_MS = [0, 1000, 3000, 5000];

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export interface DownloadWithResumeOptions {
  onProgress?: (percent: number) => void;
  onRetry?: () => void;
  signal?: AbortSignal;
}

/**
 * Download a file in chunks. On network failure, retries from the last completed byte.
 */
export async function downloadWithResume(
  url: string,
  options: DownloadWithResumeOptions = {},
): Promise<Blob> {
  const { onProgress, onRetry, signal } = options;
  const chunkSize = 2 * 1024 * 1024;
  const parts: BlobPart[] = [];
  let offset = 0;
  let totalSize: number | null = null;

  while (totalSize === null || offset < totalSize) {
    const rangeEnd =
      totalSize === null
        ? offset + chunkSize - 1
        : Math.min(offset + chunkSize - 1, totalSize - 1);

    let chunkLoaded = false;
    for (let attempt = 0; attempt < RETRY_DELAYS_MS.length; attempt++) {
      if (attempt > 0) {
        onRetry?.();
      }
      await sleep(RETRY_DELAYS_MS[attempt]);

      try {
        const headers: Record<string, string> = {};
        if (offset > 0 || totalSize !== null) {
          headers.Range = `bytes=${offset}-${rangeEnd}`;
        }

        const res = await fetch(url, {
          credentials: 'include',
          signal,
          headers,
        });

        if (!res.ok && res.status !== 206) {
          throw new Error(`Download failed (${res.status})`);
        }

        const contentRange = res.headers.get('Content-Range');
        if (contentRange) {
          const match = /\/(\d+)$/.exec(contentRange);
          if (match) {
            totalSize = Number.parseInt(match[1], 10);
          }
        } else if (res.status === 200 && offset === 0 && !headers.Range) {
          const contentLength = res.headers.get('Content-Length');
          if (contentLength) {
            totalSize = Number.parseInt(contentLength, 10);
          }
          const blob = await res.blob();
          onProgress?.(100);
          return blob;
        }

        const buffer = await res.arrayBuffer();
        if (buffer.byteLength === 0) {
          throw new Error('Empty download chunk');
        }

        parts.push(buffer);
        offset += buffer.byteLength;
        chunkLoaded = true;

        if (totalSize && totalSize > 0) {
          onProgress?.(Math.min(100, Math.round((offset / totalSize) * 100)));
        }

        if (totalSize !== null && offset >= totalSize) {
          onProgress?.(100);
        }
        break;
      } catch (error) {
        if (attempt === RETRY_DELAYS_MS.length - 1) {
          throw error;
        }
      }
    }

    if (!chunkLoaded) {
      throw new Error('Download failed after automatic retries');
    }

    if (totalSize === null && offset > 0) {
      break;
    }
  }

  return new Blob(parts);
}
