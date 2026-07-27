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

  async createProject(data: any) {
    return await prisma.project.create({
      data: {
        title: data.title,
        shortDescription: data.shortDescription,
        description: data.description,
        thumbnailUrl: data.thumbnailUrl,
        courseId: data.courseId,
        status: ProjectStatus.PENDING_REVIEW,
        members: {
          create: data.membersIds.map((userId: string) => ({
            userId,
            roleInfo: 'Contributor',
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

  async toggleLike(projectId: string) {
    // Sem autenticação, apenas incrementa like (contador simples)
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { likesCount: true },
    });

    if (!project) {
      throw new Error('Project not found');
    }

    await prisma.project.update({
      where: { id: projectId },
      data: { likesCount: { increment: 1 } },
    });

    return { liked: true, likesCount: project.likesCount + 1 };
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