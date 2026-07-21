import { NextRequest, NextResponse } from 'next/server';
import { TOKEN_COOKIE, USER_COOKIE } from '@/lib/auth';

const API_BASE = process.env.API_URL ?? 'http://localhost:3001';

export async function POST(request: NextRequest) {
  const body = await request.json();

  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Login failed' }));
    return NextResponse.json(error, { status: res.status });
  }

  const data = await res.json();
  const response = NextResponse.json({ user: data.user });

  response.cookies.set(TOKEN_COOKIE, data.accessToken, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 8,
  });

  response.cookies.set(
    USER_COOKIE,
    encodeURIComponent(JSON.stringify(data.user)),
    {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 8,
    },
  );

  return response;
}
