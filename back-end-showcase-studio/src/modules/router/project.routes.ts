import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { ProjectController } from '../controllers/project.controller';
import { canvaPresentationSchema, createProjectSchema, queryProjectSchema, updateProjectContentSchema, updateProjectStatusSchema } from '../schemas/project.schema';
import { requireAuth, requireModerator } from '../auth';

const router = new Hono();
const controller = new ProjectController();

// Rotas Públicas
router.get('/', zValidator('query', queryProjectSchema, (result, c) => {
  if (!result.success) {
    return c.json({ error: 'Invalid query parameters', details: result.error }, 400);
  }
}), controller.getAll);
router.get('/stats', controller.getPublicStats);
router.get('/:id', controller.getById);
router.patch('/:id/view', controller.incrementViews);

// Rotas de Projeto (criação, like, moderação) 
// Refatorar para caso queira dar like -> ter autenticação
router.post('/', requireAuth, zValidator('json', createProjectSchema), controller.create);
router.post('/:id/like', controller.handleLike);
router.patch('/:id/status', requireAuth, requireModerator, zValidator('json', updateProjectStatusSchema), controller.moderate);
router.delete('/:id', requireAuth, requireModerator, controller.remove);
router.patch('/:id/content', requireAuth, zValidator('json', updateProjectContentSchema), controller.updateContent);
router.post('/:id/thumbnail', requireAuth, controller.uploadThumbnail);
router.post('/:id/presentation/canva', requireAuth, zValidator('json', canvaPresentationSchema), controller.setCanvaPresentation);
router.post('/:id/presentation/pdf', requireAuth, controller.uploadPdf);
router.delete('/:id/presentation', requireAuth, controller.deletePresentation);

export const projectRoutes = router;
