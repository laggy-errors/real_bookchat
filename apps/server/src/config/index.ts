import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const defaultDbPath = path.resolve(
  process.cwd().endsWith('apps/server')
    ? path.join(process.cwd(), 'prisma/dev.db')
    : path.join(process.cwd(), 'apps/server/prisma/dev.db')
);

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = `file:${defaultDbPath}`;
}

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    console.warn('[Security Warning] JWT_SECRET environment variable is missing. Utilizing a fallback secret for startup safety.');
    return 'bookchat-super-secret-fountain-pen-key-fallback';
  }
  return secret;
}

export const config = {
  port: process.env.SERVER_PORT || 3001,
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: getJwtSecret(),
  databaseUrl: process.env.DATABASE_URL,
  corsOrigin: configCorsOrigin(),
  googleClientId: process.env.GOOGLE_CLIENT_ID,
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET,
  appUrl: process.env.APP_URL || 'http://localhost:3000',
};

function configCorsOrigin() {
  if (process.env.NODE_ENV === 'production') {
    return process.env.CORS_ORIGIN || process.env.APP_URL || '';
  }
  return process.env.CORS_ORIGIN || '*';
}

