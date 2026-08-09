import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { requireAuth, requireModerator } from '../auth';
import { ModerationController } from '../controllers/moderation.controller';
import { reviewReasonSchema } from '../schemas/submission.schema';

const router = new Hono();
const controller = new ModerationController();

router.use('*', requireAuth, requireModerator);
router.get('/projects', controller.list);
router.get('/projects/:id', controller.get);
router.patch('/projects/:id/approve', controller.approve);
router.patch('/projects/:id/request-changes', zValidator('json', reviewReasonSchema), controller.requestChanges);
router.patch('/projects/:id/reject', zValidator('json', reviewReasonSchema), controller.reject);

export const moderationRoutes = router;
