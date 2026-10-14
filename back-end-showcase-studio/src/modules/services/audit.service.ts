import { prisma } from '../../db/prisma';

type AuditEntry = {
  actorUserId?: string;
  action: string;
  resource: string;
  resourceId: string;
  metadata?: Record<string, string | boolean | number | string[]>;
};

export class AuditService {
  async record(entry: AuditEntry) {
    await prisma.auditLog.create({
      data: {
        actorUserId: entry.actorUserId,
        action: entry.action,
        resource: entry.resource,
        resourceId: entry.resourceId,
        metadata: entry.metadata,
      },
    });
  }
}
