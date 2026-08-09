import { Hono } from 'hono';
import { requireAuth, requireModerator } from '../auth';
import { SemesterController } from '../controllers/semester.controller';

const router = new Hono();
const controller = new SemesterController();

router.get('/', controller.list);
router.get('/current', controller.current);
router.post('/', requireAuth, requireModerator, controller.create);
router.patch('/:id/open', requireAuth, requireModerator, controller.open);
router.patch('/:id/close', requireAuth, requireModerator, controller.close);
router.patch('/:id/courses', requireAuth, requireModerator, controller.setCourses);

export const semesterRoutes = router;
