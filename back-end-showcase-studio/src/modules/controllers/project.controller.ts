import { Context } from 'hono';
import { ProjectService } from '../services/project.service';
import type { UploadableMedia } from '../storage/media.storage';

const projectService = new ProjectService();

export class ProjectController {
  constructor() {
    // Hono recebe os handlers como callbacks. Sem o binding, os métodos que
    // usam `this.canManage()` perdem o contexto da instância em produção.
    this.updateContent = this.updateContent.bind(this);
    this.setCanvaPresentation = this.setCanvaPresentation.bind(this);
    this.uploadThumbnail = this.uploadThumbnail.bind(this);
    this.uploadPdf = this.uploadPdf.bind(this);
    this.deletePresentation = this.deletePresentation.bind(this);
  }

  async getAll(c: Context) {
    const query = c.req.query();
    const result = await projectService.listProjects({
      courseId: query.courseId,
      semesterId: query.semesterId,
      isFeatured: query.isFeatured ? query.isFeatured === 'true' : undefined,
      page: parseInt(query.page || '1', 10),
      limit: parseInt(query.limit || '12', 10),
    });
    return c.json(result, 200);
  }

  async create(c: Context) {
    const body = await c.req.json();
    const user = c.get('user') as { id: string };
    const project = await projectService.createProject({ ...body, createdById: user.id });
    return c.json({ data: project, message: 'Submissão efetuada com sucesso.', project }, 201);
  }

  async getById(c: Context) {
    const project = await projectService.getProject(c.req.param('id')!);
    if (!project) return c.json({ error: 'Not Found', message: 'Project not found.' }, 404);
    return c.json({ data: project }, 200);
  }

  async incrementViews(c: Context) {
    const result = await projectService.incrementViews(c.req.param('id')!);
    if (!result) return c.json({ error: 'Not Found', message: 'Projeto não encontrado.' }, 404);
    return c.json({ data: result }, 200);
  }

  async handleLike(c: Context) {
    const body = await c.req.json<{ visitorId?: string }>();
    if (!body.visitorId || body.visitorId.length < 16 || body.visitorId.length > 200) {
      return c.json({ error: 'Bad Request', message: 'Identificador de visitante inválido.' }, 400);
    }
    const result = await projectService.toggleAnonymousLike(c.req.param('id')!, body.visitorId);
    if (!result) return c.json({ error: 'Not Found', message: 'Projeto não encontrado.' }, 404);
    return c.json({ data: result }, 200);
  }

  async moderate(c: Context) {
    const body = await c.req.json<{ status: 'APPROVED' | 'REJECTED' | 'CHANGES_REQUESTED' | 'PENDING_REVIEW' | 'DRAFT'; isFeatured?: boolean }>();
    const updated = await projectService.updateStatus(c.req.param('id')!, body.status, body.isFeatured);
    return c.json({ message: 'Status de moderação atualizado.', updated }, 200);
  }

  async remove(c: Context) {
    const deleted = await projectService.delete(c.req.param('id')!);
    if (!deleted) return c.json({ error: 'Not Found', message: 'Projeto não encontrado.' }, 404);
    return c.json({ message: 'Projeto excluído.' }, 200);
  }

  async updateContent(c: Context) {
    if (!(await this.canManage(c))) return c.json({ error: 'Forbidden', message: 'You cannot edit this project.' }, 403);
    const updated = await projectService.updateContent(c.req.param('id')!, await c.req.json());
    return c.json({ data: updated, message: 'Conteúdo do projeto atualizado.' }, 200);
  }

  private async canManage(c: Context) {
    const user = c.get('user') as { id: string; role: string };
    return projectService.canManageProject(c.req.param('id')!, user.id, user.role);
  }

  async setCanvaPresentation(c: Context) {
    if (!(await this.canManage(c))) return c.json({ error: 'Forbidden', message: 'You cannot edit this project media.' }, 403);
    const body = await c.req.json<{ url: string }>();
    const presentation = await projectService.setCanvaPresentation(c.req.param('id')!, body.url);
    return c.json({ data: presentation }, 200);
  }

  async uploadThumbnail(c: Context) {
    if (!(await this.canManage(c))) return c.json({ error: 'Forbidden', message: 'You cannot edit this project media.' }, 403);
    const body = await c.req.parseBody();
    const file = body.file as unknown;
    if (!file || typeof file === 'string' || Array.isArray(file) || typeof (file as { arrayBuffer?: unknown }).arrayBuffer !== 'function') return c.json({ error: 'Bad Request', message: 'A thumbnail file is required.' }, 400);
    const mediaFile = file as UploadableMedia;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(mediaFile.type)) return c.json({ error: 'Unprocessable Entity', message: 'Thumbnail must be JPEG, PNG or WebP.' }, 422);
    if (mediaFile.size > 2 * 1024 * 1024) return c.json({ error: 'Unprocessable Entity', message: 'Thumbnail must be smaller than 2 MB.' }, 422);
    const project = await projectService.uploadThumbnail(c.req.param('id')!, mediaFile);
    return c.json({ data: project }, 200);
  }

  async uploadPdf(c: Context) {
    if (!(await this.canManage(c))) return c.json({ error: 'Forbidden', message: 'You cannot edit this project media.' }, 403);
    const body = await c.req.parseBody();
    const file = body.file as unknown;
    if (!file || typeof file === 'string' || Array.isArray(file) || typeof (file as { arrayBuffer?: unknown }).arrayBuffer !== 'function') return c.json({ error: 'Bad Request', message: 'A PDF file is required.' }, 400);
    const mediaFile = file as UploadableMedia;
    if (mediaFile.type !== 'application/pdf') return c.json({ error: 'Unprocessable Entity', message: 'Presentation must be a PDF.' }, 422);
    if (mediaFile.size > 10 * 1024 * 1024) return c.json({ error: 'Unprocessable Entity', message: 'PDF must be smaller than 10 MB.' }, 422);
    const presentation = await projectService.uploadPdf(c.req.param('id')!, mediaFile);
    return c.json({ data: presentation }, 200);
  }

  async deletePresentation(c: Context) {
    if (!(await this.canManage(c))) return c.json({ error: 'Forbidden', message: 'You cannot edit this project media.' }, 403);
    await projectService.deletePresentation(c.req.param('id')!);
    return c.body(null, 204);
  }
}
