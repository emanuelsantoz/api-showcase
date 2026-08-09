import crypto from 'node:crypto';
import { prisma } from '../../db/prisma';

const TOKEN_TTL_HOURS = 72;

function hashToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export class AccessTokenService {
  async create(projectId: string) {
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + TOKEN_TTL_HOURS * 60 * 60 * 1000);

    await prisma.projectAccessToken.updateMany({
      where: { projectId, usedAt: null },
      data: { usedAt: new Date() },
    });

    await prisma.projectAccessToken.create({
      data: { projectId, tokenHash: hashToken(token), expiresAt },
    });

    return { token, expiresAt };
  }

  async findValid(token: string, projectId?: string) {
    return prisma.projectAccessToken.findFirst({
      where: {
        tokenHash: hashToken(token),
        usedAt: null,
        expiresAt: { gt: new Date() },
        ...(projectId ? { projectId } : {}),
      },
      include: {
        project: {
          include: {
            presentation: true,
            course: true,
            semester: true,
            contributors: true,
            members: { include: { user: { select: { id: true, name: true, email: true } } } },
          },
        },
      },
    });
  }

  async consume(token: string) {
    await prisma.projectAccessToken.updateMany({
      where: { tokenHash: hashToken(token), usedAt: null },
      data: { usedAt: new Date() },
    });
  }
}
