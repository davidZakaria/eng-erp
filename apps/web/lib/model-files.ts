export function getSubmissionFileUrl(submissionId: string): string {
  return `/api/proxy?path=${encodeURIComponent(`/models/submissions/${submissionId}/file`)}`;
}

export function isPdfFileName(fileUrl: string): boolean {
  return fileUrl.toLowerCase().endsWith('.pdf');
}

export function fileLabelFromUrl(fileUrl: string): string {
  const name = fileUrl.split('/').pop() ?? 'drawing';
  return name.length > 32 ? `${name.slice(0, 29)}…` : name;
}
