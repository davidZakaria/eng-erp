import { NextRequest, NextResponse } from 'next/server';
import { TOKEN_COOKIE } from '@/lib/auth';
import { isAllowedProxyPath } from '@/lib/proxy-allowlist';

const API_BASE = process.env.API_URL ?? 'http://localhost:3001';

const FORWARDED_HEADERS = [
  'content-type',
  'content-disposition',
  'content-range',
  'accept-ranges',
  'content-length',
  'etag',
] as const;

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

  const range = request.headers.get('range');
  if (range) {
    headers.Range = range;
  }

  const isReadWithoutBody =
    request.method === 'GET' || request.method === 'HEAD';

  const body = isReadWithoutBody ? undefined : await request.arrayBuffer();

  const res = await fetch(`${API_BASE}${path}`, {
    method: request.method,
    headers,
    body,
  });

  const responseHeaders = new Headers();
  for (const name of FORWARDED_HEADERS) {
    const value = res.headers.get(name);
    if (value) {
      responseHeaders.set(name, value);
    }
  }

  if (isReadWithoutBody) {
    return new NextResponse(res.body, {
      status: res.status,
      headers: responseHeaders,
    });
  }

  const data = await res.arrayBuffer();
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

export async function HEAD(request: NextRequest) {
  return proxy(request, readPath(request));
}

export async function POST(request: NextRequest) {
  return proxy(request, readPath(request));
}

export async function PUT(request: NextRequest) {
  return proxy(request, readPath(request));
}

export async function PATCH(request: NextRequest) {
  return proxy(request, readPath(request));
}

export async function DELETE(request: NextRequest) {
  return proxy(request, readPath(request));
}
