import { prisma } from '../../db/prisma';
import { ProjectStatus, StorageProvider } from '@prisma/client';
import { deleteMedia, resolveStorageProvider, uploadMedia, type UploadableMedia } from '../storage/media.storage';
import { NoOpenSemesterError, SemesterService } from './semester.service';

const details = {
  course: true,
  semester: true,
  presentation: true,
  members: { include: { user: { select: { id: true, name: true } } } },
  contributors: true,
  _count: { select: { likes: true } },
} as const;

type ProjectInput = {
  title: string;
  shortDescription: string;
  description: string;
  thumbnailUrl?: string;
  courseId: string;
  className: string;
  membersIds: string[];
  presentation?: { type: 'CANVA'; url: string };
  tags?: string[];
  liveUrl?: string;
  prototypeUrl?: string;
  repositoryUrl?: string;
  createdById: string;
};

export class ProjectService {
  private readonly semesters = new SemesterService();

  async listProjects(filters: { courseId?: string; semesterId?: string; isFeatured?: boolean; page: number; limit: number }) {
    const skip = (filters.page - 1) * filters.limit;
    const where: { status: ProjectStatus; courseId?: string; semesterId?: string; isFeatured?: boolean } = { status: ProjectStatus.APPROVED };
    if (filters.courseId) where.courseId = filters.courseId;
    if (filters.semesterId) where.semesterId = filters.semesterId;
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

  async createProject(data: ProjectInput) {
    const semester = await this.semesters.getCurrent();
    if (!semester) throw new NoOpenSemesterError();
    await this.semesters.assertCourseAcceptsProjects(semester.id, data.courseId, data.className, data.tags ?? []);
    return prisma.project.create({
      data: {
        title: data.title,
        shortDescription: data.shortDescription,
        description: data.description,
        thumbnailUrl: data.thumbnailUrl,
        courseId: data.courseId,
        className: data.className,
        semesterId: semester.id,
        tags: data.tags ?? [],
        liveUrl: data.liveUrl,
        prototypeUrl: data.prototypeUrl,
        repositoryUrl: data.repositoryUrl,
        createdById: data.createdById,
        status: ProjectStatus.PENDING_REVIEW,
        members: { create: data.membersIds.map((userId) => ({ userId, roleInfo: 'Contributor' })) },
        ...(data.presentation ? {
          presentation: {
            create: { type: 'CANVA', url: data.presentation.url, storageProvider: 'CANVA' },
          },
        } : {}),
      },
      include: details,
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
    return prisma.project.update({ where: { id }, data: { status, ...(isFeatured !== undefined && { isFeatured }) }, include: details });
  }

  async updateContent(id: string, data: { title: string; shortDescription: string; description: string; tags: string[]; liveUrl?: string; prototypeUrl?: string; repositoryUrl?: string }) {
    return prisma.project.update({ where: { id }, data: { title: data.title.trim(), shortDescription: data.shortDescription.trim(), description: data.description.trim(), tags: [...new Set(data.tags.map((tag) => tag.trim()).filter(Boolean))], liveUrl: data.liveUrl?.trim() || null, prototypeUrl: data.prototypeUrl?.trim() || null, repositoryUrl: data.repositoryUrl?.trim() || null }, include: details });
  }

  async canManageProject(id: string, userId: string, role: string) {
    const project = await prisma.project.findUnique({ where: { id }, select: { createdById: true } });
    if (!project) return false;
    return role === 'ADMIN' || role === 'COORDENADOR' || project.createdById === userId;
  }

  async setCanvaPresentation(id: string, url: string) {
    return prisma.projectPresentation.upsert({
      where: { projectId: id },
      create: { projectId: id, type: 'CANVA', url, storageProvider: 'CANVA' },
      update: { type: 'CANVA', url, storageProvider: 'CANVA', storageKey: null, contentType: null, sizeBytes: null },
    });
  }

  async uploadThumbnail(id: string, file: UploadableMedia) {
    const previous = await prisma.project.findUnique({ where: { id }, select: { thumbnailStorageProvider: true, thumbnailStorageKey: true, thumbnailUrl: true } });
    const provider = resolveStorageProvider('THUMBNAIL');
    const stored = await uploadMedia(`projects/${id}/thumbnail`, file, provider);
    const updated = await prisma.project.update({
      where: { id },
      data: { thumbnailUrl: stored.url, thumbnailStorageProvider: stored.provider, thumbnailStorageKey: stored.key },
      include: details,
    });
    if (previous?.thumbnailStorageProvider && previous.thumbnailStorageKey) {
      await deleteMedia(previous.thumbnailStorageProvider, previous.thumbnailStorageKey || previous.thumbnailUrl);
    }
    return updated;
  }

  async uploadPdf(id: string, file: UploadableMedia) {
    const previous = await prisma.projectPresentation.findUnique({ where: { projectId: id } });
    const stored = await uploadMedia(`projects/${id}/presentation.pdf`, file, resolveStorageProvider('PRESENTATION_PDF'));
    const presentation = await prisma.projectPresentation.upsert({
      where: { projectId: id },
      create: { projectId: id, type: 'PDF', url: stored.url, storageProvider: stored.provider, storageKey: stored.key, contentType: file.type, sizeBytes: file.size },
      update: { type: 'PDF', url: stored.url, storageProvider: stored.provider, storageKey: stored.key, contentType: file.type, sizeBytes: file.size },
    });
    if (previous?.storageProvider && previous.storageKey) await deleteMedia(previous.storageProvider, previous.storageKey);
    return presentation;
  }

  async deletePresentation(id: string) {
    const previous = await prisma.projectPresentation.findUnique({ where: { projectId: id } });
    if (!previous) return null;
    await prisma.projectPresentation.delete({ where: { projectId: id } });
    await deleteMedia(previous.storageProvider, previous.storageKey || previous.url);
    return previous;
  }
}
