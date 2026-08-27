import type { Context } from 'hono';
import { ReviewService } from '../services/review.service';
import { AuditService } from '../services/audit.service';

const reviewService = new ReviewService();
const audit = new AuditService();

export class ModerationController {
  async list(c: Context) {
    const query = c.req.query();
    return c.json(await reviewService.list(Number(query.page ?? 1), Number(query.limit ?? 12), query.status), 200);
  }

  async get(c: Context) {
    const project = await reviewService.getProject(c.req.param('id')!);
    if (!project) return c.json({ error: 'Not Found', message: 'Project not found.' }, 404);
    return c.json({ data: project }, 200);
  }

  async approve(c: Context) {
    const user = c.get('user') as { id: string };
    const project = await reviewService.approve(c.req.param('id')!, user.id);
    await audit.record({ actorUserId: user.id, action: 'project.approved', resource: 'project', resourceId: project.id });
    return c.json({ data: project, message: 'Projeto publicado.' }, 200);
  }

  async requestChanges(c: Context) {
    const user = c.get('user') as { id: string };
    const body = await c.req.json<{ reason: string }>();
    const result = await reviewService.requestChanges(c.req.param('id')!, user.id, body.reason);
    await audit.record({ actorUserId: user.id, action: 'project.changes_requested', resource: 'project', resourceId: result.project.id });
    return c.json({ data: result.project, editUrl: result.editUrl, emailSent: result.emailSent, message: 'Solicitação de alterações registrada.' }, 200);
  }

  async reject(c: Context) {
    const user = c.get('user') as { id: string };
    const body = await c.req.json<{ reason: string }>();
    const project = await reviewService.reject(c.req.param('id')!, user.id, body.reason);
    await audit.record({ actorUserId: user.id, action: 'project.rejected', resource: 'project', resourceId: project.id });
    return c.json({ data: project, message: 'Projeto rejeitado.' }, 200);
  }
}
