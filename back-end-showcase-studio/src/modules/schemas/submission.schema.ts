import { z } from 'zod';

const externalUrl = z.string().url().refine((value) => ['http:', 'https:'].includes(new URL(value).protocol), 'Use uma URL HTTP ou HTTPS.');
const tagsSchema = z.array(z.string().trim().min(1).max(40)).max(20).default([]);
const contributorSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().email().optional().or(z.literal('')),
  roleInfo: z.string().trim().max(80).optional(),
  avatarIndex: z.number().int().min(0).optional(),
  avatarColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
});

export const publicSubmissionSchema = z.object({
  title: z.string().min(5).max(100),
  shortDescription: z.string().min(10).max(255),
  description: z.string().min(20),
  courseId: z.string().uuid(),
  className: z.string().trim().min(1).max(80),
  submitterName: z.string().min(2).max(120),
  submitterEmail: z.string().email(),
  submitterAvatarColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  membersIds: z.array(z.string().uuid()).default([]),
  contributors: z.array(contributorSchema).max(20).default([]),
  tags: tagsSchema,
  liveUrl: externalUrl.optional(),
  prototypeUrl: externalUrl.optional(),
  repositoryUrl: externalUrl.optional(),
  presentationType: z.enum(['PDF', 'CANVA', 'POWERPOINT']),
  canvaUrl: z.string().url().optional(),
  powerpointUrl: z.string().url().optional(),
});

export const publicResubmissionSchema = publicSubmissionSchema.omit({
  courseId: true,
  className: true,
  submitterName: true,
  submitterEmail: true,
  membersIds: true,
});

export const reviewReasonSchema = z.object({
  reason: z.string().min(5).max(2000),
});
