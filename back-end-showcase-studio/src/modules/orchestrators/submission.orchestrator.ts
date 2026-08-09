import crypto from 'node:crypto';
import { prisma } from '../../db/prisma';
import { ProjectStatus, StorageProvider } from '@prisma/client';
import { deleteMedia, resolveStorageProvider, uploadMedia, type UploadableMedia } from '../storage/media.storage';
import { AccessTokenService } from '../services/access-token.service';
import { NoOpenSemesterError, SemesterService } from '../services/semester.service';

const details = {
  course: true,
  semester: true,
  presentation: true,
  members: { include: { user: { select: { id: true, name: true } } } },
  contributors: true,
  _count: { select: { likes: true } },
} as const;

export type PublicSubmissionInput = {
  title: string;
  shortDescription: string;
  description: string;
  courseId: string;
  membersIds: string[];
  contributors: Array<{ name: string; email?: string; roleInfo?: string }>;
  submitterName: string;
  submitterEmail: string;
  tags: string[];
  liveUrl?: string;
  prototypeUrl?: string;
  repositoryUrl?: string;
  thumbnail: UploadableMedia;
  presentation: {
    type: 'PDF';
    file: UploadableMedia;
  } | {
    type: 'CANVA';
    url: string;
  };
};

export class SubmissionOrchestrator {
  private readonly accessTokens = new AccessTokenService();
  private readonly semesters = new SemesterService();

  async submit(input: PublicSubmissionInput) {
    let thumbnail: { provider: StorageProvider; key: string; url: string } | null = null;
    let presentation: { provider: StorageProvider; key: string; url: string; contentType?: string; sizeBytes?: number } | null = null;
    const projectId = crypto.randomUUID();
    const semester = await this.semesters.getCurrent();
    if (!semester) throw new NoOpenSemesterError();

    try {
      const thumbnailStored = await uploadMedia(
        `projects/${projectId}/thumbnail`,
        input.thumbnail,
        resolveStorageProvider('THUMBNAIL'),
      );
      thumbnail = thumbnailStored;

      if (input.presentation.type === 'PDF') {
        const pdfStored = await uploadMedia(
          `projects/${projectId}/presentation.pdf`,
          input.presentation.file,
          resolveStorageProvider('PRESENTATION_PDF'),
        );
        presentation = { ...pdfStored, contentType: input.presentation.file.type, sizeBytes: input.presentation.file.size };
      }

      const project = await prisma.project.create({
        data: {
          id: projectId,
          title: input.title,
          shortDescription: input.shortDescription,
          description: input.description,
          courseId: input.courseId,
          semesterId: semester.id,
          submitterName: input.submitterName,
          submitterEmail: input.submitterEmail,
          status: ProjectStatus.PENDING_REVIEW,
          tags: input.tags,
          liveUrl: input.liveUrl,
          prototypeUrl: input.prototypeUrl,
          repositoryUrl: input.repositoryUrl,
          thumbnailUrl: thumbnail.url,
          thumbnailStorageProvider: thumbnail.provider,
          thumbnailStorageKey: thumbnail.key,
          ...(input.membersIds.length > 0 ? { members: { create: input.membersIds.map((userId) => ({ userId, roleInfo: 'Contributor' })) } } : {}),
          ...(input.contributors.length > 0 ? { contributors: { create: input.contributors } } : {}),
          ...(input.presentation.type === 'CANVA'
            ? { presentation: { create: { type: 'CANVA', url: input.presentation.url, storageProvider: 'CANVA' } } }
            : { presentation: { create: { type: 'PDF', url: presentation!.url, storageProvider: presentation!.provider, storageKey: presentation!.key, contentType: presentation!.contentType, sizeBytes: presentation!.sizeBytes } } }),
        },
        include: details,
      });
      const access = await this.accessTokens.create(project.id);
      return { project, accessToken: access.token, accessExpiresAt: access.expiresAt };
    } catch (error) {
      if (presentation) await deleteMedia(presentation.provider, presentation.key).catch(() => undefined);
      if (thumbnail) await deleteMedia(thumbnail.provider, thumbnail.key).catch(() => undefined);
      if (projectId) await prisma.project.delete({ where: { id: projectId } }).catch(() => undefined);
      throw error;
    }
  }

  async resubmit(projectId: string, input: Omit<PublicSubmissionInput, 'courseId' | 'membersIds' | 'submitterName' | 'submitterEmail'>, accessToken: string) {
    const previous = await prisma.project.findUnique({
      where: { id: projectId },
      include: { presentation: true },
    });
    if (!previous) throw new Error('Project not found.');

    const thumbnail = await uploadMedia(`projects/${projectId}/thumbnail`, input.thumbnail, resolveStorageProvider('THUMBNAIL'));
    let presentation: { url: string; key: string | null; provider: StorageProvider; contentType?: string; sizeBytes?: number };
    if (input.presentation.type === 'PDF') {
      const stored = await uploadMedia(`projects/${projectId}/presentation.pdf`, input.presentation.file, resolveStorageProvider('PRESENTATION_PDF'));
      presentation = { ...stored, contentType: input.presentation.file.type, sizeBytes: input.presentation.file.size };
    } else {
      presentation = { url: input.presentation.url, key: null, provider: resolveStorageProvider('CANVA') };
    }

    let project;
    try {
      project = await prisma.$transaction(async (tx) => {
      const updated = await tx.project.update({
        where: { id: projectId },
        data: {
          title: input.title,
          shortDescription: input.shortDescription,
          description: input.description,
          thumbnailUrl: thumbnail.url,
          thumbnailStorageProvider: thumbnail.provider,
          thumbnailStorageKey: thumbnail.key,
          status: ProjectStatus.PENDING_REVIEW,
          revision: { increment: 1 },
          tags: input.tags,
          liveUrl: input.liveUrl,
          prototypeUrl: input.prototypeUrl,
          repositoryUrl: input.repositoryUrl,
        },
      });
      await tx.projectContributor.deleteMany({ where: { projectId } });
      if (input.contributors.length > 0) {
        await tx.projectContributor.createMany({ data: input.contributors.map((contributor) => ({ projectId, ...contributor })) });
      }
      await tx.projectPresentation.upsert({
        where: { projectId },
        create: {
          projectId,
          type: input.presentation.type,
          url: presentation.url,
          storageProvider: presentation.provider,
          storageKey: presentation.key,
          contentType: presentation.contentType,
          sizeBytes: presentation.sizeBytes,
        },
        update: {
          type: input.presentation.type,
          url: presentation.url,
          storageProvider: presentation.provider,
          storageKey: presentation.key,
          contentType: presentation.contentType,
          sizeBytes: presentation.sizeBytes,
        },
      });
      return updated;
      });
    } catch (error) {
      await deleteMedia(presentation.provider, presentation.key).catch(() => undefined);
      await deleteMedia(thumbnail.provider, thumbnail.key).catch(() => undefined);
      throw error;
    }

    if (previous.presentation?.storageKey && (previous.presentation.storageProvider !== presentation.provider || previous.presentation.storageKey !== presentation.key)) {
      await deleteMedia(previous.presentation.storageProvider, previous.presentation.storageKey).catch(() => undefined);
    }
    if (previous.thumbnailStorageKey && (previous.thumbnailStorageProvider !== thumbnail.provider || previous.thumbnailStorageKey !== thumbnail.key)) {
      await deleteMedia(previous.thumbnailStorageProvider!, previous.thumbnailStorageKey).catch(() => undefined);
    }
    await this.accessTokens.consume(accessToken);
    return prisma.project.findUnique({ where: { id: project.id }, include: details });
  }
}
