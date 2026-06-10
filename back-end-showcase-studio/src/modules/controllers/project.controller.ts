import { Context } from 'hono';
import { ProjectService } from '../services/project.service';

const projectService = new ProjectService();

export class ProjectController {
  async getAll(c: Context) {
    const query = c.req.query();
    const page = parseInt(query.page || '1', 10);
    const limit = parseInt(query.limit || '12', 10);
    const isFeatured = query.isFeatured ? query.isFeatured === 'true' : undefined;

    const result = await projectService.listProjects({
      courseId: query.courseId,
      isFeatured,
      page,
      limit,
    });
    return c.json(result, 200);
  }

  async create(c: Context) {
    const body = await c.req.json();
    const user = c.get('jwtPayload') as { id: string };

    const project = await projectService.createProject(body, user.id);
    return c.json({ message: 'Submissão efetuada com sucesso.', project }, 201);
  }

  async incrementViews(c: Context) {
    const { id } = c.req.param();
    const result = await projectService.incrementViews(id);
    return c.json(result, 200);
  }

  async handleLike(c: Context) {
    const { id } = c.req.param();
    const user = c.get('jwtPayload') as { id: string };

    const result = await projectService.toggleLike(id, user.id);
    return c.json(result, 200);
  }

  async moderate(c: Context) {
    const { id } = c.req.param();
    const body = await c.req.json();

    const updated = await projectService.updateStatus(id, body.status, body.isFeatured);
    return c.json({ message: 'Status de moderação atualizado.', updated }, 200);
  }
}