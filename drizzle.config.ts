import { defineConfig } from 'drizzle-kit';

/**
 * Drizzle Kit config.
 * Reads DATABASE_URL directly from process.env because drizzle-kit
 * runs as a CLI tool, not inside Next.js — so it can't import env.ts
 * (which has `import 'server-only'`).
 */
export default defineConfig({
  schema: './src/lib/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  verbose: true,
  strict: true,
});
