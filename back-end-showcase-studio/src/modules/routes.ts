import { Hono } from 'hono';
import { jwt } from 'hono/jwt';
import { zValidator } from '@hono/zod-validator';
import { ProjectController } from './controllers/project.controller';
import { createProjectSchema, queryProjectSchema, updateProjectStatusSchema } from './schemas/project.schema';
import { env } from '../config/env';

const router = new Hono();
const controller = new ProjectController();
const authMiddleware = jwt({ secret: env.JWT_SECRET, alg: 'HS256' });

router.get('/', zValidator('query', queryProjectSchema, (result, c) => {
  if (!result.success) {
    return c.json({ error: 'Invalid query parameters', details: result.error }, 400);
  }
}), controller.getAll);
router.patch('/:id/view', controller.incrementViews);

// Rotas Protegidas por Autenticação (Alunos e Professores)
router.post('/', authMiddleware, zValidator('json', createProjectSchema), controller.create);
router.post('/:id/like', authMiddleware, controller.handleLike);

// Rotas Administrativas (Moderação)
router.patch('/:id/status', authMiddleware, zValidator('json', updateProjectStatusSchema), controller.moderate);

export const projectRoutes = router;