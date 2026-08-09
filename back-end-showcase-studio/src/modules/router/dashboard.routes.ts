import { Hono } from 'hono';
import { prisma } from '../../db/prisma';
import { requireAuth, requireModerator } from '../auth';

export const dashboardRoutes = new Hono();
dashboardRoutes.get('/analytics', requireAuth, requireModerator, async (c) => {
  const projects = await prisma.project.findMany({ where: { status: 'APPROVED' }, select: { viewsCount: true, tags: true } });
  const topics = new Map<string, number>();
  for (const project of projects) for (const tag of project.tags) topics.set(tag, (topics.get(tag) ?? 0) + 1);
  const users = await prisma.projectMember.findMany({ where: { project: { status: 'APPROVED' } }, select: { userId: true }, distinct: ['userId'] });
  const semesters = await prisma.semester.count();
  return c.json({ data: {
    publishedProjects: projects.length,
    totalViews: projects.reduce((total, project) => total + project.viewsCount, 0),
    participatingStudents: users.length,
    semesters,
    traffic: [],
    topics: [...topics.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([topic, searches]) => ({ topic, searches })),
  } });
});
