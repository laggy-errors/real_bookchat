import { prisma } from '../prisma';
import { logger } from './logger';

/**
 * Creates a persistent audit log entry in the database.
 * Designed not to throw and disrupt user actions if database logging fails.
 */
export async function createAuditLog(
  userId: string | null,
  action: string,
  entity: string,
  entityId: string | null,
  details?: any
) {
  try {
    const log = await prisma.auditLog.create({
      data: {
        userId,
        action,
        entity,
        entityId,
        details: details ? JSON.stringify(details) : null,
      },
    });
    logger.info({ auditLogId: log.id, action, entity, entityId, userId }, `AuditLog recorded: ${action} on ${entity}`);
    return log;
  } catch (error) {
    logger.error({ error, userId, action, entity, entityId }, 'Failed to create AuditLog entry');
    return null;
  }
}
