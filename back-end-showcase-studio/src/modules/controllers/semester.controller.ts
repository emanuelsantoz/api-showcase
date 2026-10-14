import type { Context } from 'hono';
import { z } from 'zod';
import { SemesterService } from '../services/semester.service';
import { AuditService } from '../services/audit.service';

const service = new SemesterService();
const audit = new AuditService();
const createSchema = z.object({
  year: z.number().int().min(2000).max(2100),
  number: z.union([z.literal(1), z.literal(2)]),
  startsAt: z.coerce.date(),
  endsAt: z.coerce.date(),
}).refine((value) => value.endsAt > value.startsAt, { message: 'endsAt deve ser posterior a startsAt.' });

const coursesSchema = z.object({
  courses: z.array(z.object({ courseId: z.string().uuid(), className: z.string().trim().min(1).max(80), theme: z.string().trim().min(1).max(255), tags: z.array(z.string().trim().min(1).max(40)).min(1).max(20) })).max(100),
});

function serializeSemester(semester: any) {
  return { ...semester, courses: semester.courses?.map((course: any) => ({ ...course, tags: course.tags?.map((item: any) => item.tag.name) ?? [] })) };
}

export class SemesterController {
  async list(c: Context) {
    const includeArchived = c.req.query('includeArchived') === 'true';
    return c.json({ data: (await service.list(includeArchived)).map(serializeSemester) }, 200);
  }

  async current(c: Context) {
    const current = await service.getCurrent();
    if (!current) return c.json({ error: 'Not Found', message: 'Nenhum semestre está aberto para submissões.' }, 404);
    return c.json({ data: serializeSemester(current) }, 200);
  }

  async create(c: Context) {
    const body = createSchema.parse(await c.req.json());
    const semester = await service.create(body);
    const user = c.get('user') as { id: string };
    await audit.record({ actorUserId: user.id, action: 'semester.created', resource: 'semester', resourceId: semester.id });
    return c.json({ data: serializeSemester(semester), message: 'Semestre criado.' }, 201);
  }

  async remove(c: Context) {
    const semester = await service.remove(c.req.param('id')!);
    const user = c.get('user') as { id: string };
    await audit.record({ actorUserId: user.id, action: 'semester.deleted', resource: 'semester', resourceId: semester.id });
    return c.json({ data: semester, message: 'Semestre removido.' }, 200);
  }

  async open(c: Context) {
    const semester = await service.open(c.req.param('id')!);
    const user = c.get('user') as { id: string };
    await audit.record({ actorUserId: user.id, action: 'semester.opened', resource: 'semester', resourceId: semester.id });
    return c.json({ data: serializeSemester(semester), message: 'Semestre aberto para submissões.' }, 200);
  }

  async close(c: Context) {
    const semester = await service.close(c.req.param('id')!);
    const user = c.get('user') as { id: string };
    await audit.record({ actorUserId: user.id, action: 'semester.closed', resource: 'semester', resourceId: semester.id });
    return c.json({ data: semester, message: 'Semestre encerrado.' }, 200);
  }

  async setCourses(c: Context) {
    const body = coursesSchema.parse(await c.req.json());
    const semester = await service.setCourses(c.req.param('id')!, body.courses);
    const user = c.get('user') as { id: string };
    await audit.record({ actorUserId: user.id, action: 'semester.courses_updated', resource: 'semester', resourceId: semester.id, metadata: { courses: body.courses.length } });
    return c.json({ data: serializeSemester(semester), message: 'Disciplinas e temas configurados para este semestre.' }, 200);
  }
}
