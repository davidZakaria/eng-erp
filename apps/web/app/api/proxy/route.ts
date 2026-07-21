import { NextRequest, NextResponse } from 'next/server';
import { TOKEN_COOKIE } from '@/lib/auth';

const API_BASE = process.env.API_URL ?? 'http://localhost:3001';

async function proxy(request: NextRequest, path: string) {
  const token = request.cookies.get(TOKEN_COOKIE)?.value;
  const headers: Record<string, string> = {};

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const requestContentType = request.headers.get('content-type');
  if (requestContentType) {
    headers['Content-Type'] = requestContentType;
  }

  const body =
    request.method !== 'GET' && request.method !== 'HEAD'
      ? await request.arrayBuffer()
      : undefined;

  const res = await fetch(`${API_BASE}${path}`, {
    method: request.method,
    headers,
    body,
  });

  const data = await res.arrayBuffer();
  const responseHeaders = new Headers();
  const responseContentType = res.headers.get('Content-Type');
  if (responseContentType) responseHeaders.set('Content-Type', responseContentType);
  const disposition = res.headers.get('Content-Disposition');
  if (disposition) responseHeaders.set('Content-Disposition', disposition);

  return new NextResponse(data, {
    status: res.status,
    headers: responseHeaders,
  });
}

export async function GET(request: NextRequest) {
  const path = request.nextUrl.searchParams.get('path') ?? '';
  return proxy(request, path);
}

export async function POST(request: NextRequest) {
  const path = request.nextUrl.searchParams.get('path') ?? '';
  return proxy(request, path);
}

export async function PATCH(request: NextRequest) {
  const path = request.nextUrl.searchParams.get('path') ?? '';
  return proxy(request, path);
}
