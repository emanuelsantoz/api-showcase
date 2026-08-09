import { Hono } from 'hono';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { Role } from '@prisma/client';
import { prisma } from '../../db/prisma';
import { requireAuth, requireModerator } from '../auth';

const userRoutes = new Hono();
const createProfessorSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().email(),
  password: z.string().min(8).max(120),
});

userRoutes.use('*', requireAuth, requireModerator);

userRoutes.get('/professors', async (c) => {
  const users = await prisma.user.findMany({
    where: { role: { in: [Role.ADMIN, Role.COORDENADOR] } },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
    orderBy: { name: 'asc' },
  });
  return c.json({ data: users });
});

userRoutes.post('/professors', async (c) => {
  const body = createProfessorSchema.parse(await c.req.json());
  const password = await bcrypt.hash(body.password, 12);
  const user = await prisma.user.create({
    data: { name: body.name, email: body.email.toLowerCase(), password, role: Role.COORDENADOR },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  });
  return c.json({ data: user, message: 'Professor cadastrado. Envie as credenciais temporárias por um canal seguro.' }, 201);
});

export { userRoutes };
