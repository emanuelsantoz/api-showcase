import { Hono } from 'hono';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { Role } from '@prisma/client';
import { prisma } from '../../db/prisma';
import { requireAuth, requireAdmin } from '../auth';
import { AuditService } from '../services/audit.service';

const userRoutes = new Hono();
const audit = new AuditService();
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

userRoutes.delete('/professors/:id', requireAuth, requireAdmin, async (c) => {
  const actor = (c as any).get('user') as { id: string };
  const professorId = c.req.param('id')!;
  if (professorId === actor.id) return c.json({ error: 'Conflict', message: 'Você não pode remover a sua própria conta.' }, 409);

  const professor = await prisma.user.findUnique({ where: { id: professorId }, select: { id: true, role: true } });
  if (!professor) return c.json({ error: 'Not Found', message: 'Professor não encontrado.' }, 404);
  if (professor.role !== Role.COORDENADOR) return c.json({ error: 'Forbidden', message: 'Contas de administrador não podem ser removidas por esta tela.' }, 403);

  await prisma.$transaction(async (tx) => {
    // Revisões são registros operacionais ligados ao professor; removê-las evita
    // que a relação restritiva bloqueie a exclusão da conta desativada.
    await tx.projectReview.deleteMany({ where: { reviewerId: professor.id } });
    await tx.user.delete({ where: { id: professor.id } });
  });
  await audit.record({ actorUserId: actor.id, action: 'professor.deleted', resource: 'user', resourceId: professor.id, metadata: { role: professor.role } });
  return c.json({ message: 'Professor removido.' }, 200);
});

export { userRoutes };
