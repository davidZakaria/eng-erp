import { cookies } from 'next/headers';
import { AuthUser } from './types';

const TOKEN_COOKIE = 'eng_njd_token';
const USER_COOKIE = 'eng_njd_user';

export async function getSession(): Promise<{
  token: string;
  user: AuthUser;
} | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(TOKEN_COOKIE)?.value;
  const userRaw = cookieStore.get(USER_COOKIE)?.value;

  if (!token || !userRaw) return null;

  try {
    const user = JSON.parse(decodeURIComponent(userRaw)) as AuthUser;
    return { token, user };
  } catch {
    return null;
  }
}

export { TOKEN_COOKIE, USER_COOKIE };
