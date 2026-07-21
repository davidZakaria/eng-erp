export function getDrawingFileUrl(drawingId: string): string {
  return `/api/proxy?path=${encodeURIComponent(`/drawings/${drawingId}/file`)}`;
}

export function fileExtensionFromUrl(fileUrl: string): string {
  const name = fileUrl.split('/').pop() ?? '';
  const dot = name.lastIndexOf('.');
  return dot >= 0 ? name.slice(dot + 1).toUpperCase() : 'FILE';
}

export function isPdfFileUrl(fileUrl: string): boolean {
  return fileUrl.toLowerCase().endsWith('.pdf');
}

export function isDwgFileUrl(fileUrl: string): boolean {
  return fileUrl.toLowerCase().endsWith('.dwg');
}

export function drawingFileActionLabel(fileUrl: string): string {
  if (isPdfFileUrl(fileUrl)) return 'Preview PDF';
  if (isDwgFileUrl(fileUrl)) return 'Download DWG';
  return 'Download CAD';
}
