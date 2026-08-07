import { prisma } from '../../db/prisma';
import { ProjectStatus } from '@prisma/client';

const details = {
  course: true,
  members: { include: { user: { select: { id: true, name: true } } } },
  _count: { select: { likes: true } },
} as const;

export class ProjectService {
  async listProjects(filters: { courseId?: string; isFeatured?: boolean; page: number; limit: number }) {
    const skip = (filters.page - 1) * filters.limit;
    const where: { status: ProjectStatus; courseId?: string; isFeatured?: boolean } = { status: ProjectStatus.APPROVED };
    if (filters.courseId) where.courseId = filters.courseId;
    if (filters.isFeatured !== undefined) where.isFeatured = filters.isFeatured;

    const [projects, total] = await prisma.$transaction([
      prisma.project.findMany({ where, skip, take: filters.limit, include: details, orderBy: { createdAt: 'desc' } }),
      prisma.project.count({ where }),
    ]);
    return { data: projects, meta: { total, page: filters.page, limit: filters.limit, totalPages: Math.ceil(total / filters.limit) } };
  }

  async getProject(id: string) {
    return prisma.project.findFirst({ where: { id, status: ProjectStatus.APPROVED }, include: details });
  }

  async createProject(data: { title: string; shortDescription: string; description: string; thumbnailUrl?: string; courseId: string; membersIds: string[] }) {
    return prisma.project.create({
      data: {
        title: data.title,
        shortDescription: data.shortDescription,
        description: data.description,
        thumbnailUrl: data.thumbnailUrl,
        courseId: data.courseId,
        status: ProjectStatus.PENDING_REVIEW,
        members: { create: data.membersIds.map((userId) => ({ userId, roleInfo: 'Contributor' })) },
      },
    });
  }

  async incrementViews(id: string) {
    return prisma.project.update({ where: { id }, data: { viewsCount: { increment: 1 } }, select: { id: true, viewsCount: true } });
  }

  async toggleLike(projectId: string, userId: string) {
    return prisma.$transaction(async (tx) => {
      const project = await tx.project.findUnique({ where: { id: projectId }, select: { likesCount: true } });
      if (!project) throw new Error('Project not found');
      const like = await tx.like.findUnique({ where: { userId_projectId: { userId, projectId } } });
      const liked = !like;
      if (like) {
        await tx.like.delete({ where: { userId_projectId: { userId, projectId } } });
        await tx.project.update({ where: { id: projectId }, data: { likesCount: { decrement: 1 } } });
      } else {
        await tx.like.create({ data: { userId, projectId } });
        await tx.project.update({ where: { id: projectId }, data: { likesCount: { increment: 1 } } });
      }
      return { liked, likesCount: project.likesCount + (liked ? 1 : -1) };
    });
  }

  async updateStatus(id: string, status: ProjectStatus, isFeatured?: boolean) {
    return prisma.project.update({ where: { id }, data: { status, ...(isFeatured !== undefined && { isFeatured }) } });
  }
}
