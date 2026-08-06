import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { ProjectController } from './controllers/project.controller';
import { createProjectSchema, queryProjectSchema, updateProjectStatusSchema } from './schemas/project.schema';
import { requireAuth, requireModerator } from './auth';

const router = new Hono();
const controller = new ProjectController();

// Rotas Públicas
router.get('/', zValidator('query', queryProjectSchema, (result, c) => {
  if (!result.success) {
    return c.json({ error: 'Invalid query parameters', details: result.error }, 400);
  }
}), controller.getAll);
router.get('/:id', controller.getById);
router.patch('/:id/view', controller.incrementViews);

// Rotas de Projeto (criação, like, moderação)
router.post('/', requireAuth, zValidator('json', createProjectSchema), controller.create);
router.post('/:id/like', requireAuth, controller.handleLike);
router.patch('/:id/status', requireAuth, requireModerator, zValidator('json', updateProjectStatusSchema), controller.moderate);

export const projectRoutes = router;
