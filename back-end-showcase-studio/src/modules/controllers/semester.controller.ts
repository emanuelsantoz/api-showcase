import type { Context } from 'hono';
import { z } from 'zod';
import { SemesterService } from '../services/semester.service';

const service = new SemesterService();
const createSchema = z.object({
  year: z.number().int().min(2000).max(2100),
  number: z.union([z.literal(1), z.literal(2)]),
  theme: z.string().min(1).max(255),
  startsAt: z.coerce.date(),
  endsAt: z.coerce.date(),
}).refine((value) => value.endsAt > value.startsAt, { message: 'endsAt deve ser posterior a startsAt.' });

const themeSchema = z.object({ theme: z.string().max(255) });

export class SemesterController {
  async list(c: Context) {
    const includeArchived = c.req.query('includeArchived') === 'true';
    return c.json({ data: await service.list(includeArchived) }, 200);
  }

  async current(c: Context) {
    const current = await service.getCurrent();
    if (!current) return c.json({ error: 'Not Found', message: 'Nenhum semestre está aberto para submissões.' }, 404);
    return c.json({ data: current }, 200);
  }

  async create(c: Context) {
    const body = createSchema.parse(await c.req.json());
    return c.json({ data: await service.create(body), message: 'Semestre criado.' }, 201);
  }

  async open(c: Context) {
    return c.json({ data: await service.open(c.req.param('id')!), message: 'Semestre aberto para submissões.' }, 200);
  }

  async close(c: Context) {
    return c.json({ data: await service.close(c.req.param('id')!), message: 'Semestre encerrado.' }, 200);
  }

  async updateTheme(c: Context) {
    const body = themeSchema.parse(await c.req.json());
    return c.json({ data: await service.updateTheme(c.req.param('id')!, body.theme), message: 'Tema atualizado.' }, 200);
  }
}
