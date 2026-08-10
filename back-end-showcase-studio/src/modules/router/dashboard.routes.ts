import { Hono } from 'hono';
import { prisma } from '../../db/prisma';
import { requireAuth, requireModerator } from '../auth';

export const dashboardRoutes = new Hono();
dashboardRoutes.get('/analytics', requireAuth, requireModerator, async (c) => {
  const projects = await prisma.project.findMany({
    where: { status: 'APPROVED' },
    select: {
      viewsCount: true,
      likesCount: true,
      tags: true,
      submitterName: true,
      submitterEmail: true,
      contributors: { select: { name: true, email: true } },
    },
  });
  const topics = new Map<string, number>();
  for (const project of projects) for (const tag of project.tags) topics.set(tag, (topics.get(tag) ?? 0) + 1);
  const students = new Set<string>();
  const addStudent = (name: string | null | undefined, email: string | null | undefined) => {
    const identity = (email || name || '').trim().toLocaleLowerCase();
    if (identity) students.add(identity);
  };
  for (const project of projects) {
    addStudent(project.submitterName, project.submitterEmail);
    for (const contributor of project.contributors) addStudent(contributor.name, contributor.email);
  }
  const semesters = await prisma.semester.count();
  return c.json({ data: {
    publishedProjects: projects.length,
    totalViews: projects.reduce((total, project) => total + project.viewsCount, 0),
    participatingStudents: students.size,
    totalLikes: projects.reduce((total, project) => total + project.likesCount, 0),
    semesters,
    traffic: [],
    topics: [...topics.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([topic, searches]) => ({ topic, searches })),
  } });
});
