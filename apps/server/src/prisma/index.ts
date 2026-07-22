import { PrismaClient } from '@prisma/client';
import { config } from '../config';
import path from 'path';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

const defaultDbPath = path.resolve(
  process.cwd().endsWith('apps/server')
    ? path.join(process.cwd(), 'prisma/dev.db')
    : path.join(process.cwd(), 'apps/server/prisma/dev.db')
);

let dbUrl = process.env.DATABASE_URL || `file:${defaultDbPath}`;

// Optimize connection pool limits for PostgreSQL in production concurrency
if (dbUrl.startsWith('postgres://') || dbUrl.startsWith('postgresql://')) {
  try {
    const urlObj = new URL(dbUrl);
    if (!urlObj.searchParams.has('connection_limit')) {
      urlObj.searchParams.set('connection_limit', '25');
    }
    if (!urlObj.searchParams.has('pool_timeout')) {
      urlObj.searchParams.set('pool_timeout', '15');
    }
    dbUrl = urlObj.toString();
  } catch (e) {
    console.warn('[Prisma Init] Failed to parse DATABASE_URL as URL object:', e);
  }
}

console.log('[Prisma Init] Active DATABASE_URL environment:', process.env.DATABASE_URL);
console.log('[Prisma Init] Configured databaseUrl:', dbUrl);

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    datasources: {
      db: {
        url: dbUrl,
      },
    },
    log: config.nodeEnv === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (config.nodeEnv !== 'production') globalForPrisma.prisma = prisma;

