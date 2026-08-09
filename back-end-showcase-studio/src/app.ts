import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { Prisma } from '@prisma/client';
import { projectRoutes } from './modules/router/project.routes';
import { courseRoutes } from './modules/router/courses.routes';
import { authRoutes } from './modules/router/auth.routes';
import { publicSubmissionRoutes } from './modules/router/public-submission.routes';
import { moderationRoutes } from './modules/router/moderation.routes';
import { semesterRoutes } from './modules/router/semester.routes';
import { userRoutes } from './modules/router/users.routes';
import { env } from './config/env';
import { NoOpenSemesterError, SemesterCourseConfigurationError } from './modules/services/semester.service';

const app = new Hono().basePath('/api/v1');

app.get('/healthz', (c) => c.json({ status: 'ok' }));
app.use('*', logger());

const corsOrigin = env.NODE_ENV === 'production'
  ? process.env.CORS_ORIGIN || 'https://showcase-studio.vercel.app'
  : '*';

app.use('*', cors({
  origin: corsOrigin,
  allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  credentials: corsOrigin !== '*',
  maxAge: 86400,
}));

app.onError((err, c) => {
  console.error(`[Error Handler]: ${err.message}`);
  if (err instanceof NoOpenSemesterError) return c.json({ error: 'Conflict', message: err.message }, 409);
  if (err instanceof SemesterCourseConfigurationError) return c.json({ error: 'Unprocessable Entity', message: err.message }, 422);
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2025') return c.json({ error: 'Not Found', message: 'Resource not found.' }, 404);
    if (err.code === 'P2002') return c.json({ error: 'Conflict', message: 'A resource with this value already exists.' }, 409);
    if (err.code === 'P2003') return c.json({ error: 'Unprocessable Entity', message: 'A referenced resource does not exist.' }, 422);
  }
  const message = env.NODE_ENV === 'production' ? 'Ocorreu um erro inesperado no servidor.' : err.message;
  return c.json({ error: 'Internal Server Error', message }, 500);
});

app.route('/projects', projectRoutes);
app.route('/courses', courseRoutes);
app.route('/auth', authRoutes);
app.route('/public/submissions', publicSubmissionRoutes);
app.route('/moderation', moderationRoutes);
app.route('/semesters', semesterRoutes);
app.route('/users', userRoutes);

export default app;
