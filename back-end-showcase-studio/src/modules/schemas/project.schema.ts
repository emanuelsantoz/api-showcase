import { z } from 'zod';

export const createProjectSchema = z.object({
  title: z.string().min(5).max(100),
  shortDescription: z.string().min(10).max(255),
  description: z.string().min(20),
  thumbnailUrl: z.string().url().optional(),
  courseId: z.string().uuid(),
  membersIds: z.array(z.string().uuid()).min(1),
  presentation: z.object({
    type: z.literal('CANVA'),
    url: z.string().url(),
  }).optional(),
});

export const canvaPresentationSchema = z.object({
  url: z.string().url().refine((url) => /canva\.com\/design\/.+\/view/i.test(url), 'URL pública do Canva inválida.'),
});

export const updateProjectStatusSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED', 'PENDING_REVIEW', 'DRAFT']),
  isFeatured: z.boolean().optional(),
});

export const queryProjectSchema = z.object({
  courseId: z.string().optional(),
  isFeatured: z.string().optional(),
  page: z.string().optional().default('1'),
  limit: z.string().optional().default('12'),
});
