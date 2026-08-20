import 'server-only';
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import type { NextRequest } from 'next/server';
import { env } from '@/lib/env';
import type { User } from '@/lib/db/schema';

const SESSION_COOKIE = 'waqt-session';
const SESSION_DURATION = 7 * 24 * 60 * 60; // 7 days in seconds

const encodedKey = new TextEncoder().encode(env.sessionSecret);

export interface SessionPayload {
  userId: string;
  email: string;
  [key: string]: unknown;
}

/**
 * Create a signed JWT session token.
 */
export async function encryptSession(payload: SessionPayload): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION}s`)
    .sign(encodedKey);
}

/**
 * Verify and decode a JWT session token.
 */
export async function decryptSession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, encodedKey, {
      algorithms: ['HS256'],
    });
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

/**
 * Set the session cookie after successful login/signup.
 */
export async function setSessionCookie(user: Pick<User, 'id' | 'email'>): Promise<void> {
  const token = await encryptSession({ userId: user.id, email: user.email });
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: env.isProduction,
    sameSite: 'lax',
    maxAge: SESSION_DURATION,
    path: '/',
  });
}

/**
 * Clear the session cookie (logout).
 */
export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

/**
 * Get the current session payload from the cookie.
 * Returns null if not authenticated or token invalid.
 */
export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return decryptSession(token);
}

/**
 * Get the session from a NextRequest's Cookie header.
 * Use this in Route Handlers where cookies() from next/headers
 * may not reliably read the request cookies.
 */
export async function getSessionFromRequest(request: NextRequest): Promise<SessionPayload | null> {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return decryptSession(token);
}

/**
 * Get the current authenticated user ID.
 * Throws if not authenticated — use in protected routes/actions.
 */
export async function requireAuth(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) {
    throw new Error('Unauthorized');
  }
  return session;
}
