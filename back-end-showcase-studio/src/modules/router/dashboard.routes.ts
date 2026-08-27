import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { createHash } from 'node:crypto';
import { prisma } from '../../db/prisma';
import { requireAuth, requireModerator } from '../auth';
import { engagementSchema } from '../schemas/project.schema';
import { enforceRateLimit } from '../security/rate-limit';

export const dashboardRoutes = new Hono();
const DAY_MS = 24 * 60 * 60_000;

dashboardRoutes.post('/visit', enforceRateLimit({ scope: 'site-visit', limit: 30, windowMs: 60_000 }), zValidator('json', engagementSchema), async (c) => {
  const { visitorId } = await c.req.json<{ visitorId: string }>();
  const visitorHash = createHash('sha256').update(visitorId).digest('hex');
  const day = startUtcDay(new Date());
  await prisma.siteVisit.upsert({
    where: { visitorHash_day: { visitorHash, day } },
    create: { visitorHash, day },
    update: {},
  });
  return c.json({ data: { counted: true } }, 201);
});

dashboardRoutes.get('/analytics', requireAuth, requireModerator, async (c) => {
  const today = startUtcDay(new Date());
  const currentStart = addUtcDays(today, -29);
  const previousStart = addUtcDays(currentStart, -30);
  const [projects, currentVisits, previousVisits, projectViews, semesters] = await Promise.all([
    prisma.project.findMany({
    where: { status: 'APPROVED' },
    select: {
      viewsCount: true,
      likesCount: true,
      tags: true,
      submitterName: true,
      submitterEmail: true,
      contributors: { select: { name: true, email: true } },
    },
    }),
    prisma.siteVisit.findMany({ where: { day: { gte: currentStart, lte: today } }, select: { day: true } }),
    prisma.siteVisit.count({ where: { day: { gte: previousStart, lt: currentStart } } }),
    prisma.anonymousView.findMany({ where: { createdAt: { gte: currentStart } }, select: { createdAt: true } }),
    prisma.semester.count(),
  ]);
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
  const visitsByDay = countByDate(currentVisits.map((visit) => visit.day));
  const viewsByDay = countByDate(projectViews.map((view) => view.createdAt));
  const traffic = Array.from({ length: 30 }, (_, index) => {
    const day = addUtcDays(currentStart, index);
    const key = dateKey(day);
    return { day: `${key.slice(8, 10)}/${key.slice(5, 7)}`, visits: visitsByDay.get(key) ?? 0, projectViews: viewsByDay.get(key) ?? 0 };
  });
  const uniqueVisits = currentVisits.length;
  const changePercentage = previousVisits === 0 ? null : Math.round(((uniqueVisits - previousVisits) / previousVisits) * 100);
  return c.json({ data: {
    publishedProjects: projects.length,
    totalViews: projects.reduce((total, project) => total + project.viewsCount, 0),
    participatingStudents: students.size,
    totalLikes: projects.reduce((total, project) => total + project.likesCount, 0),
    semesters,
    traffic,
    trafficSummary: { uniqueVisits, projectViews: projectViews.length, previousUniqueVisits: previousVisits, changePercentage },
    topics: [...topics.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([topic, searches]) => ({ topic, searches })),
  } });
});

function startUtcDay(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function addUtcDays(date: Date, amount: number) {
  return new Date(date.getTime() + amount * DAY_MS);
}

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function countByDate(dates: Date[]) {
  const counts = new Map<string, number>();
  for (const date of dates) {
    const key = dateKey(date);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}
