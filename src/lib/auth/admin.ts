import 'server-only';
import { eq } from 'drizzle-orm';
import type { NextRequest } from 'next/server';
import { db, schema } from '@/lib/db/client';
import { getSession, getSessionFromRequest, type SessionPayload } from '@/lib/auth/session';

/**
 * Admin authorization helper.
 * Checks that the current session user has role = 'admin'.
 * See CODEBASE_PATTERNS.md §1 (Admin & Worker Authentication).
 *
 * Pass a NextRequest in route handlers for reliable cookie reading.
 * Call without arguments in Server Components / Server Actions.
 */
export async function requireAdmin(request?: NextRequest): Promise<{ session: SessionPayload; userId: string }> {
  const session = request ? await getSessionFromRequest(request) : await getSession();
  if (!session) {
    throw new AdminAuthError('Unauthorized', 401);
  }

  const [user] = await db
    .select({ role: schema.users.role })
    .from(schema.users)
    .where(eq(schema.users.id, session.userId))
    .limit(1);

  if (!user || user.role !== 'admin') {
    throw new AdminAuthError('Forbidden', 403);
  }

  return { session, userId: session.userId };
}

export class AdminAuthError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}
