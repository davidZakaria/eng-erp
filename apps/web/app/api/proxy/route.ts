import { NextRequest, NextResponse } from 'next/server';
import { TOKEN_COOKIE } from '@/lib/auth';
import { isAllowedProxyPath } from '@/lib/proxy-allowlist';

const API_BASE = process.env.API_URL ?? 'http://localhost:3001';

async function proxy(request: NextRequest, path: string) {
  if (!path.startsWith('/') || !isAllowedProxyPath(path)) {
    return NextResponse.json({ message: 'Forbidden proxy path' }, { status: 403 });
  }

  const token = request.cookies.get(TOKEN_COOKIE)?.value;
  if (!token) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
  };

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

function readPath(request: NextRequest) {
  return request.nextUrl.searchParams.get('path') ?? '';
}

export async function GET(request: NextRequest) {
  return proxy(request, readPath(request));
}

export async function POST(request: NextRequest) {
  return proxy(request, readPath(request));
}

export async function PATCH(request: NextRequest) {
  return proxy(request, readPath(request));
}

export async function DELETE(request: NextRequest) {
  return proxy(request, readPath(request));
}
