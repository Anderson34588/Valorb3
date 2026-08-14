import { cookies } from 'next/headers';

const SESSION_COOKIE = '__Host-happyseeds_session';
const REACTUS_BASE_URL = process.env.REACTUS_BASE_URL ?? 'https://reactus-api.happyseeds.ai';
const HAPPYSEEDS_PROJECT_ID = process.env.HAPPYSEEDS_PROJECT_ID ?? '';

export interface SessionUser {
  openid: string;
  email?: string | null;
  display_name?: string | null;
  avatar_url?: string | null;
}

/**
 * Validates the session cookie server-side and returns the current user.
 * Returns null if not authenticated.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  try {
    const url = new URL('/user', REACTUS_BASE_URL);
    url.searchParams.set('app_id', HAPPYSEEDS_PROJECT_ID);
    const res = await fetch(url.toString(), {
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const data = await res.json();
    const user = data?.data ?? data;
    if (!user?.openid) return null;
    return user as SessionUser;
  } catch {
    return null;
  }
}
