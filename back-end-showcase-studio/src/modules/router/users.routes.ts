import { Hono } from 'hono';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { Role } from '@prisma/client';
import { prisma } from '../../db/prisma';
import { requireAuth, requireAdmin } from '../auth';

const userRoutes = new Hono();
const profileSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().email(),
  phone: z.string().trim().max(40).optional().or(z.literal('')),
  jobTitle: z.string().trim().max(120).optional().or(z.literal('')),
  department: z.string().trim().max(120).optional().or(z.literal('')),
  location: z.string().trim().max(120).optional().or(z.literal('')),
  bio: z.string().trim().max(2000).optional().or(z.literal('')),
  avatarUrl: z.string().url().optional().or(z.literal('')),
  notifySubmissions: z.boolean(),
  notifyWeeklySummary: z.boolean(),
  notifySearchTrends: z.boolean(),
});
const createProfessorSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().email(),
  password: z.string().min(8).max(120),
});

const profileSelect = { id: true, name: true, email: true, role: true, phone: true, jobTitle: true, department: true, location: true, bio: true, avatarUrl: true, notifySubmissions: true, notifyWeeklySummary: true, notifySearchTrends: true, createdAt: true } as const;

userRoutes.get('/me', requireAuth, async (c) => {
  const authUser = (c as any).get('user') as { id: string };
  const user = await prisma.user.findUnique({ where: { id: authUser.id }, select: profileSelect });
  if (!user) return c.json({ error: 'Not Found', message: 'Usuário não encontrado.' }, 404);
  return c.json({ data: user });
});

userRoutes.patch('/me', requireAuth, async (c) => {
  const authUser = (c as any).get('user') as { id: string };
  const body = profileSchema.parse(await c.req.json());
  const user = await prisma.user.update({ where: { id: authUser.id }, data: { ...body, email: body.email.toLowerCase() }, select: profileSelect });
  return c.json({ data: user, message: 'Perfil atualizado.' });
});

userRoutes.get('/professors', requireAuth, requireAdmin, async (c) => {
  const users = await prisma.user.findMany({
    where: { role: { in: [Role.ADMIN, Role.COORDENADOR] } },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
    orderBy: { name: 'asc' },
  });
  return c.json({ data: users });
});

userRoutes.post('/professors', requireAuth, requireAdmin, async (c) => {
  const body = createProfessorSchema.parse(await c.req.json());
  const password = await bcrypt.hash(body.password, 12);
  const user = await prisma.user.create({
    data: { name: body.name, email: body.email.toLowerCase(), password, role: Role.COORDENADOR },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  });
  return c.json({ data: user, message: 'Professor cadastrado. Envie as credenciais temporárias por um canal seguro.' }, 201);
});

export { userRoutes };
