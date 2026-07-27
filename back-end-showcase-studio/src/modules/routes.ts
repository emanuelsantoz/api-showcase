import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { ProjectController } from './controllers/project.controller';
import { createProjectSchema, queryProjectSchema, updateProjectStatusSchema } from './schemas/project.schema';

const router = new Hono();
const controller = new ProjectController();

// Rotas Públicas
router.get('/', zValidator('query', queryProjectSchema, (result, c) => {
  if (!result.success) {
    return c.json({ error: 'Invalid query parameters', details: result.error }, 400);
  }
}), controller.getAll);
router.patch('/:id/view', controller.incrementViews);

// Rotas de Projeto (criação, like, moderação)
router.post('/', zValidator('json', createProjectSchema), controller.create);
router.post('/:id/like', controller.handleLike);
router.patch('/:id/status', zValidator('json', updateProjectStatusSchema), controller.moderate);

export const projectRoutes = router;