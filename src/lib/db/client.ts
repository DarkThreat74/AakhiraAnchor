import 'server-only';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { env } from '@/lib/env';
import * as schema from './schema';

/**
 * Drizzle client using Neon's serverless HTTP driver.
 * Works in Vercel serverless functions without connection pooling issues.
 *
 * The connection is created lazily — if DATABASE_URL is not set (e.g. during
 * build), we create a no-op placeholder that will only fail if actually queried.
 * This allows `next build` to succeed without a live database.
 */
function createDb() {
  if (!env.databaseUrl) {
    // During build without env vars, return a proxy that throws on use
    return new Proxy({} as ReturnType<typeof drizzle>, {
      get() {
        throw new Error('DATABASE_URL is not set. Configure your Neon database connection.');
      },
    });
  }
  const sqlClient = neon(env.databaseUrl);
  return drizzle(sqlClient, { schema });
}

export const db = createDb();

export { schema };
