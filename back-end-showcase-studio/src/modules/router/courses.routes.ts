import { Hono } from 'hono';
import { SemesterStatus } from '@prisma/client';
import { prisma } from '../../db/prisma';
import { requireAuth, requireModerator } from '../auth';
import { z } from 'zod';

export const courseRoutes = new Hono();

const createCourseSchema = z.object({
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(500).optional().or(z.literal('')),
});

courseRoutes.post('/', requireAuth, requireModerator, async (c) => {
  const body = createCourseSchema.parse(await c.req.json());
  const course = await prisma.course.create({ data: { name: body.name, description: body.description || null } });
  return c.json({ data: course, message: 'Curso cadastrado.' }, 201);
});

courseRoutes.get('/admin', requireAuth, requireModerator, async (c) => {
  const courses = await prisma.course.findMany({ orderBy: { name: 'asc' } });
  return c.json({ data: courses });
});

courseRoutes.get('/', async (c) => {
  const openSemester = await prisma.semester.findFirst({
    where: { status: SemesterStatus.OPEN },
    include: { courses: { include: { course: true }, orderBy: { course: { name: 'asc' } } } },
  });

  if (!openSemester) {
    return c.json({
      data: [],
      message: 'As disciplinas ficam disponíveis quando a administração abre o recebimento de projetos para um semestre.',
    });
  }

  return c.json({
    data: openSemester.courses.map((semesterCourse) => ({ ...semesterCourse.course, theme: semesterCourse.theme, className: semesterCourse.className, tags: semesterCourse.tags })),
  });
});
