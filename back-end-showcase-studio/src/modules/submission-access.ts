import type { MiddlewareHandler } from 'hono';
import { AccessTokenService } from './services/access-token.service';

const accessTokens = new AccessTokenService();

export const requireSubmissionAccess: MiddlewareHandler = async (c, next) => {
  const header = c.req.header('Authorization');
  if (!header?.startsWith('Bearer ')) return c.json({ error: 'Unauthorized', message: 'Submission access token is required.' }, 401);

  const token = header.slice(7);
  const project = await accessTokens.findValid(token, c.req.param('id'));
  if (!project) return c.json({ error: 'Unauthorized', message: 'Submission access token is invalid or expired.' }, 401);

  c.set('submissionAccess', { token, projectId: project.projectId, project: project.project });
  await next();
};
