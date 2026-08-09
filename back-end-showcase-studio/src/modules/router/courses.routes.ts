import { Hono } from 'hono';
import { SemesterStatus } from '@prisma/client';
import { prisma } from '../../db/prisma';
import { requireAuth, requireModerator } from '../auth';

export const courseRoutes = new Hono();

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

  return c.json({ data: openSemester.courses.map((semesterCourse) => semesterCourse.course) });
});
