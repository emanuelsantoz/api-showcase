import { prisma } from '../../db/prisma';
import { ProjectStatus, StorageProvider } from '@prisma/client';
import { createHash } from 'node:crypto';
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
    const visible = await prisma.project.findFirst({ where: { id, status: ProjectStatus.APPROVED }, select: { id: true } });
    if (!visible) return null;
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

  async toggleAnonymousLike(projectId: string, visitorId: string) {
    const visitorHash = createHash('sha256').update(visitorId).digest('hex');
    return prisma.$transaction(async (tx) => {
      const project = await tx.project.findFirst({ where: { id: projectId, status: ProjectStatus.APPROVED }, select: { likesCount: true } });
      if (!project) return null;
      const existing = await tx.anonymousLike.findUnique({ where: { projectId_visitorHash: { projectId, visitorHash } } });
      const liked = !existing;
      if (existing) {
        await tx.anonymousLike.delete({ where: { projectId_visitorHash: { projectId, visitorHash } } });
        await tx.project.update({ where: { id: projectId }, data: { likesCount: { decrement: 1 } } });
      } else {
        await tx.anonymousLike.create({ data: { projectId, visitorHash } });
        await tx.project.update({ where: { id: projectId }, data: { likesCount: { increment: 1 } } });
      }
      return { liked, likesCount: project.likesCount + (liked ? 1 : -1) };
    });
  }

  async updateStatus(id: string, status: ProjectStatus, isFeatured?: boolean) {
    return prisma.project.update({ where: { id }, data: { status, ...(isFeatured !== undefined && { isFeatured }) }, include: details });
  }

  async delete(id: string) {
    const project = await prisma.project.findUnique({
      where: { id },
      select: {
        thumbnailStorageProvider: true,
        thumbnailStorageKey: true,
        thumbnailUrl: true,
        presentation: { select: { storageProvider: true, storageKey: true, url: true } },
      },
    });
    if (!project) return null;

    await prisma.project.delete({ where: { id } });
    if (project.thumbnailStorageProvider) {
      await deleteMedia(project.thumbnailStorageProvider, project.thumbnailStorageKey || project.thumbnailUrl);
    }
    if (project.presentation?.storageProvider) {
      await deleteMedia(project.presentation.storageProvider, project.presentation.storageKey || project.presentation.url);
    }
    return { id };
  }

  async updateContent(id: string, data: { title: string; shortDescription: string; description: string; submitterName?: string; submitterEmail?: string; courseId?: string; semesterId?: string; className?: string; tags: string[]; liveUrl?: string; prototypeUrl?: string; repositoryUrl?: string }) {
    if (data.courseId || data.semesterId || data.className) {
      const current = await prisma.project.findUnique({ where: { id }, select: { courseId: true, semesterId: true, className: true } });
      if (!current) return null;
      const courseId = data.courseId ?? current.courseId;
      const semesterId = data.semesterId ?? current.semesterId;
      const className = data.className?.trim() || current.className;
      const offering = await prisma.semesterCourse.findUnique({ where: { semesterId_courseId_className: { semesterId, courseId, className } } });
      if (!offering) throw new Error('A disciplina não está vinculada a essa turma e semestre.');
    }
    return prisma.project.update({ where: { id }, data: { title: data.title.trim(), shortDescription: data.shortDescription.trim(), description: data.description.trim(), submitterName: data.submitterName?.trim(), submitterEmail: data.submitterEmail?.trim() || null, courseId: data.courseId, semesterId: data.semesterId, className: data.className?.trim(), tags: [...new Set(data.tags.map((tag) => tag.trim()).filter(Boolean))], liveUrl: data.liveUrl?.trim() || null, prototypeUrl: data.prototypeUrl?.trim() || null, repositoryUrl: data.repositoryUrl?.trim() || null }, include: details });
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
      // A nova thumbnail já foi salva; a limpeza da antiga não deve desfazer a atualização.
      await deleteMedia(previous.thumbnailStorageProvider, previous.thumbnailStorageKey || previous.thumbnailUrl).catch((error) => {
        console.error('[ProjectService] previous thumbnail cleanup failed', {
          id,
          errorName: error instanceof Error ? error.name : 'UnknownError',
          errorMessage: error instanceof Error ? error.message : String(error),
        });
      });
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
