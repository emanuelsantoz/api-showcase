import { prisma } from '../../db/prisma';
import { ProjectStatus } from '@prisma/client';

export class ProjectService {
  async listProjects(filters: { courseId?: string; isFeatured?: boolean; page: number; limit: number }) {
    const skip = (filters.page - 1) * filters.limit;

    const whereClause: any = { status: ProjectStatus.APPROVED };
    if (filters.courseId) whereClause.courseId = filters.courseId;
    if (filters.isFeatured !== undefined) whereClause.isFeatured = filters.isFeatured;

    const [projects, total] = await prisma.$transaction([
      prisma.project.findMany({
        where: whereClause,
        skip,
        take: filters.limit,
        include: {
          course: true,
          members: { include: { user: { select: { id: true, name: true } } } },
          _count: { select: { likes: true } }
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.project.count({ where: whereClause }),
    ]);

    return {
      data: projects,
      meta: {
        total,
        page: filters.page,
        limit: filters.limit,
        totalPages: Math.ceil(total / filters.limit),
      },
    };
  }

  async createProject(data: any, ownerId: string) {
    const allMembers = Array.from(new Set([ownerId, ...data.membersIds]));
    
    return await prisma.project.create({
      data: {
        title: data.title,
        shortDescription: data.shortDescription,
        description: data.description,
        thumbnailUrl: data.thumbnailUrl,
        courseId: data.courseId,
        status: ProjectStatus.PENDING_REVIEW,
        members: {
          create: allMembers.map((userId) => ({
            userId,
            roleInfo: userId === ownerId ? 'Leader' : 'Contributor',
          })),
        },
      },
    });
  }

  async incrementViews(id: string) {
    return await prisma.project.update({
      where: { id },
      data: { viewsCount: { increment: 1 } },
      select: { id: true, viewsCount: true },
    });
  }

  async toggleLike(projectId: string, userId: string) {
    const existingLike = await prisma.like.findUnique({
      where: { userId_projectId: { userId, projectId } },
    });

    if (existingLike) {
      await prisma.like.delete({ where: { userId_projectId: { userId, projectId } } });
      return { liked: false };
    }

    await prisma.like.create({ data: { userId, projectId } });
    return { liked: true };
  }

  async updateStatus(id: string, status: ProjectStatus, isFeatured?: boolean) {
    return await prisma.project.update({
      where: { id },
      data: {
        status,
        ...(isFeatured !== undefined && { isFeatured }),
      },
    });
  }
}