import { z } from 'zod';

const externalUrl = z.string().url().refine((value) => ['http:', 'https:'].includes(new URL(value).protocol), 'Use uma URL HTTP ou HTTPS.');

export const createProjectSchema = z.object({
  title: z.string().trim().min(1).max(100),
  shortDescription: z.string().min(10).max(255),
  description: z.string().min(20),
  thumbnailUrl: z.string().url().optional(),
  courseId: z.string().uuid(),
  membersIds: z.array(z.string().uuid()).min(1),
  tags: z.array(z.string().trim().min(1).max(40)).max(20).default([]),
  liveUrl: externalUrl.optional(),
  prototypeUrl: externalUrl.optional(),
  repositoryUrl: externalUrl.optional(),
  presentation: z.object({
    type: z.literal('CANVA'),
    url: z.string().url(),
  }).optional(),
});

export const canvaPresentationSchema = z.object({
  url: z.string().url().refine((url) => /canva\.com\/design\/.+\/view/i.test(url), 'URL pública do Canva inválida.'),
});

export const updateProjectStatusSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED', 'CHANGES_REQUESTED', 'PENDING_REVIEW', 'DRAFT']),
  isFeatured: z.boolean().optional(),
});

export const queryProjectSchema = z.object({
  courseId: z.string().optional(),
  // IDs históricos da migration podem ser hashes estáveis; novos semestres usam UUID.
  semesterId: z.string().min(1).optional(),
  isFeatured: z.string().optional(),
  page: z.string().optional().default('1'),
  limit: z.string().optional().default('12'),
});

export const updateProjectContentSchema = z.object({
  title: z.string().trim().min(1).max(100),
  shortDescription: z.string().min(10).max(255),
  description: z.string().min(20),
  submitterName: z.string().trim().min(2).max(120).optional(),
  submitterEmail: z.string().trim().email().max(180).optional().or(z.literal('')),
  courseId: z.string().uuid().optional(),
  semesterId: z.string().min(1).optional(),
  className: z.string().trim().min(1).max(120).optional(),
  tags: z.array(z.string().trim().min(1).max(40)).max(20),
  liveUrl: externalUrl.optional().or(z.literal('')),
  prototypeUrl: externalUrl.optional().or(z.literal('')),
  repositoryUrl: externalUrl.optional().or(z.literal('')),
});
