import pino from 'pino';

export const logger = pino({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  base: { env: process.env.NODE_ENV || 'development' },
  timestamp: pino.stdTimeFunctions.isoTime,
});

export function logSecurityEvent(event: string, details: any) {
  logger.info({ event, ...details }, `[SECURITY] ${event}`);
}
