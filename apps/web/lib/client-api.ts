export async function clientApi<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const method = options.method ?? 'GET';
  const isFormData = options.body instanceof FormData;

  const url = `/api/proxy?path=${encodeURIComponent(path)}`;

  const headers: Record<string, string> = {};
  if (!isFormData && options.body) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(url, {
    ...options,
    method,
    headers: { ...headers, ...(options.headers as Record<string, string>) },
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(
      Array.isArray(error.message)
        ? error.message.join(', ')
        : (error.message ?? `Request failed: ${res.status}`),
    );
  }

  if (res.status === 204) {
    return undefined as T;
  }

  const text = await res.text();
  if (!text) {
    return undefined as T;
  }

  return JSON.parse(text) as T;
}
