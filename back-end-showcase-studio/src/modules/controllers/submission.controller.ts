import type { Context } from 'hono';
import { z } from 'zod';
import { SubmissionOrchestrator, type PublicSubmissionInput } from '../orchestrators/submission.orchestrator';
import { AccessTokenService } from '../services/access-token.service';
import { publicResubmissionSchema, publicSubmissionSchema } from '../schemas/submission.schema';
import type { UploadableMedia } from '../storage/media.storage';

const orchestrator = new SubmissionOrchestrator();
const accessTokens = new AccessTokenService();
type PublicMetadata = Omit<PublicSubmissionInput, 'thumbnail' | 'presentation'>;
type ResubmissionMetadata = Omit<PublicMetadata, 'courseId' | 'className' | 'membersIds' | 'submitterName' | 'submitterEmail'>;

export class SubmissionController {
  async create(c: Context) {
    const body = await c.req.parseBody();
    const input = await parseSubmissionBody(body as Record<string, unknown>);
    const result = await orchestrator.submit(input);
    return c.json({ data: result.project, accessToken: result.accessToken, accessExpiresAt: result.accessExpiresAt }, 201);
  }

  async access(c: Context) {
    const body = await c.req.json<{ projectId: string; token: string }>();
    const access = await accessTokens.findValid(body.token, body.projectId);
    if (!access) return c.json({ error: 'Unauthorized', message: 'Submission access token is invalid or expired.' }, 401);
    return c.json({ data: access.project, accessToken: body.token, expiresAt: access.expiresAt }, 200);
  }

  async get(c: Context) {
    const access = c.get('submissionAccess') as { project: unknown };
    return c.json({ data: access.project }, 200);
  }

  async update(c: Context) {
    const access = c.get('submissionAccess') as { projectId: string };
    const body = await c.req.parseBody();
    const input = await parseResubmissionBody(body as Record<string, unknown>);
    const project = await orchestrator.resubmit(access.projectId, input, (c.get('submissionAccess') as { token: string }).token);
    return c.json({ data: project, message: 'Projeto atualizado. Reenvie para validação.' }, 200);
  }

  async resubmit(c: Context) {
    const access = c.get('submissionAccess') as { projectId: string; token: string };
    const project = await orchestrator.resubmit(access.projectId, await parseResubmissionBody(await c.req.parseBody() as Record<string, unknown>), access.token);
    return c.json({ data: project, message: 'Projeto reenviado para validação.' }, 200);
  }
}

async function parseSubmissionBody(body: Record<string, unknown>): Promise<PublicSubmissionInput> {
  const metadata = parseMetadata(body, true);
  const contributors = metadata.contributors.map((contributor, index) => ({
    ...contributor,
    avatarFile: getOptionalFile(body[`contributorAvatar_${index}`]),
  }));
  contributors.forEach(({ avatarFile }) => { if (avatarFile) validateAvatar(avatarFile); });
  const submitterAvatarFile = getOptionalFile(body.submitterAvatar);
  if (submitterAvatarFile) validateAvatar(submitterAvatarFile);
  const thumbnail = getFile(body.thumbnail);
  validateThumbnail(thumbnail);
  const presentation = parsePresentation(body);
  return { ...metadata, contributors, submitterAvatarFile, thumbnail, presentation };
}

async function parseResubmissionBody(body: Record<string, unknown>): Promise<Omit<PublicSubmissionInput, 'courseId' | 'className' | 'membersIds' | 'submitterName' | 'submitterEmail'>> {
  const metadata = parseMetadata(body, false);
  const thumbnail = getFile(body.thumbnail);
  validateThumbnail(thumbnail);
  return { ...metadata, thumbnail, presentation: parsePresentation(body) };
}

function parseMetadata(body: Record<string, unknown>, identity: true): PublicMetadata;
function parseMetadata(body: Record<string, unknown>, identity: false): ResubmissionMetadata;
function parseMetadata(body: Record<string, unknown>, identity: boolean): PublicMetadata | ResubmissionMetadata {
  const rawMembers = typeof body.membersIds === 'string' ? parseJson(body.membersIds, []) : body.membersIds;
  const rawContributors = typeof body.contributors === 'string' ? parseJson(body.contributors, []) : body.contributors;
  const rawTags = typeof body.tags === 'string' ? parseJson(body.tags, []) : body.tags;
  const schema = identity ? publicSubmissionSchema : publicResubmissionSchema;
  const result = schema.safeParse({
    title: body.title,
    shortDescription: body.shortDescription,
    description: body.description,
    ...(identity ? { courseId: body.courseId, className: body.className, submitterName: body.submitterName, submitterEmail: body.submitterEmail, membersIds: rawMembers } : {}),
    contributors: rawContributors,
    tags: rawTags,
    liveUrl: optionalString(body.liveUrl),
    prototypeUrl: optionalString(body.prototypeUrl),
    repositoryUrl: optionalString(body.repositoryUrl),
    presentationType: body.presentationType,
    canvaUrl: body.canvaUrl,
    powerpointUrl: body.powerpointUrl,
  });
  if (!result.success) throw new z.ZodError(result.error.issues);
  const data = result.data as z.infer<typeof publicSubmissionSchema>;
  const common: ResubmissionMetadata = {
    title: data.title,
    shortDescription: data.shortDescription,
    description: data.description,
    contributors: data.contributors,
    tags: data.tags,
    liveUrl: data.liveUrl,
    prototypeUrl: data.prototypeUrl,
    repositoryUrl: data.repositoryUrl,
  };
  if (!identity) return common;
  return {
    ...common,
    courseId: data.courseId,
    className: data.className,
    membersIds: data.membersIds,
    submitterName: data.submitterName,
    submitterEmail: data.submitterEmail,
  };
}

function parsePresentation(body: Record<string, unknown>): PublicSubmissionInput['presentation'] {
  if (body.presentationType === 'CANVA') {
    const url = String(body.canvaUrl ?? '');
    if (!/^https?:\/\/(www\.)?canva\.com\/design\/.+\/view/i.test(url)) throw new Error('URL pública do Canva inválida.');
    return { type: 'CANVA', url };
  }
  if (body.presentationType === 'POWERPOINT') {
    const url = String(body.powerpointUrl ?? '');
    if (!/^https?:\/\/(www\.)?1drv\.ms\/p\/.+/i.test(url)) throw new Error('URL de incorporaÃ§Ã£o do PowerPoint invÃ¡lida.');
    return { type: 'POWERPOINT', url };
  }
  const file = getFile(body.presentation);
  if (file.type !== 'application/pdf') throw new Error('A apresentação deve ser um PDF.');
  if (file.size > 10 * 1024 * 1024) throw new Error('O PDF deve ter no máximo 10 MB.');
  return { type: 'PDF', file };
}

function getFile(value: unknown) {
  if (!value || typeof value === 'string' || Array.isArray(value) || typeof (value as { arrayBuffer?: unknown }).arrayBuffer !== 'function') {
    throw new Error('Arquivo obrigatório não enviado.');
  }
  return value as UploadableMedia;
}

function getOptionalFile(value: unknown) {
  if (!value || typeof value === 'string' || Array.isArray(value) || typeof (value as { arrayBuffer?: unknown }).arrayBuffer !== 'function') return undefined;
  return value as UploadableMedia;
}

function validateThumbnail(file: UploadableMedia) {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new Error('A thumbnail deve ser JPEG, PNG ou WEBP.');
  if (file.size > 2 * 1024 * 1024) throw new Error('A thumbnail deve ter no máximo 2 MB.');
}

function validateAvatar(file: UploadableMedia) {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new Error('A foto do integrante deve ser JPEG, PNG ou WEBP.');
  if (file.size > 2 * 1024 * 1024) throw new Error('A foto do integrante deve ter no mÃ¡ximo 2 MB.');
}

function parseJson(value: string, fallback: unknown) {
  try { return JSON.parse(value); } catch { return fallback; }
}

function optionalString(value: unknown) {
  const stringValue = typeof value === 'string' ? value.trim() : '';
  return stringValue || undefined;
}
