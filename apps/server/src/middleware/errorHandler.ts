import { Request, Response, NextFunction } from 'express';
import { AppError, ForbiddenError } from '../utils/errors';
import { config } from '../config';
import { logger, logSecurityEvent } from '../utils/logger';

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const isAppError = err instanceof AppError;
  const statusCode = isAppError ? err.statusCode : 500;
  const errorCode = isAppError ? err.errorCode : 'INTERNAL_SERVER_ERROR';
  
  // Safe message defaulting for production
  let message = err.message || 'An unexpected error occurred';
  if (config.nodeEnv === 'production' && !isAppError) {
    message = 'An unexpected internal error occurred. Please try again later.';
  }

  // Log full error details securely server-side
  logger.error({
    err: {
      message: err.message,
      stack: err.stack,
      name: err.name,
      ...err,
    },
    request: {
      method: req.method,
      url: req.url,
      ip: req.ip,
      userId: (req as any).user?.id,
    }
  }, `Server Error [${errorCode}]: ${err.message || 'No message'}`);

  // Specifically log security-relevant permission-denied attempts
  if (err instanceof ForbiddenError) {
    logSecurityEvent('PERMISSION_DENIED', {
      userId: (req as any).user?.id,
      url: req.url,
      method: req.method,
      ip: req.ip,
      reason: err.message,
    });
  }

  res.status(statusCode).json({
    status: 'error',
    message,
    errorCode,
    ...(config.nodeEnv === 'development' && { stack: err.stack }),
  });
}
