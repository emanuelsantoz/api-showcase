import { Hono } from 'hono';
import { prisma } from '../db/prisma';

export const courseRoutes = new Hono();

courseRoutes.get('/', async (c) => {
  const courses = await prisma.course.findMany({ orderBy: { name: 'asc' } });
  return c.json({ data: courses });
});
