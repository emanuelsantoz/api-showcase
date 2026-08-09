import { Hono } from 'hono';
import { requireSubmissionAccess } from '../submission-access';
import { SubmissionController } from '../controllers/submission.controller';

const router = new Hono();
const controller = new SubmissionController();

router.post('/', controller.create);
router.post('/access', controller.access);
router.get('/:id', requireSubmissionAccess, controller.get);
router.post('/:id/resubmit', requireSubmissionAccess, controller.resubmit);

export const publicSubmissionRoutes = router;
