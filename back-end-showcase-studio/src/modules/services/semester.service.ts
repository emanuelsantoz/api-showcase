import { SemesterStatus } from '@prisma/client';
import { prisma } from '../../db/prisma';

const semesterDetails = {
  courses: { include: { course: true, tags: { include: { tag: true } } }, orderBy: { course: { name: 'asc' } } },
  _count: { select: { projects: { where: { status: 'APPROVED' } } } },
} as const;

export type CreateSemesterInput = {
  year: number;
  number: 1 | 2;
  startsAt: Date;
  endsAt: Date;
};

export type SemesterCourseInput = { courseId: string; className: string; theme: string; tags: string[] };

export class NoOpenSemesterError extends Error {
  constructor() {
    super('Nenhum semestre está aberto para submissões.');
    this.name = 'NoOpenSemesterError';
  }
}

export class SemesterCourseConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SemesterCourseConfigurationError';
  }
}

export class SemesterDeletionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SemesterDeletionError';
  }
}

export class SemesterService {
  async list(includeArchived = false) {
    return prisma.semester.findMany({
      where: includeArchived ? undefined : { status: { not: SemesterStatus.ARCHIVED } },
      include: semesterDetails,
      orderBy: [{ year: 'desc' }, { number: 'desc' }],
    });
  }

  async getCurrent() {
    return prisma.semester.findFirst({
      where: { status: SemesterStatus.OPEN },
      include: semesterDetails,
      orderBy: [{ startsAt: 'desc' }, { updatedAt: 'desc' }],
    });
  }

  async getById(id: string) {
    return prisma.semester.findUnique({ where: { id }, include: semesterDetails });
  }

  async create(input: CreateSemesterInput) {
    const code = `${input.year}.${input.number}`;
    return prisma.semester.create({
      data: {
        year: input.year,
        number: input.number,
        code,
        label: `${input.number}º semestre de ${input.year}`,
        startsAt: input.startsAt,
        endsAt: input.endsAt,
      },
      include: semesterDetails,
    });
  }

  async remove(id: string) {
    const semester = await prisma.semester.findUnique({
      where: { id },
      select: { id: true, label: true, status: true, _count: { select: { projects: true } } },
    });
    if (!semester) throw new SemesterDeletionError('Semestre não encontrado.');
    if (semester.status === SemesterStatus.OPEN) {
      throw new SemesterDeletionError('Encerre o recebimento de projetos antes de remover este semestre.');
    }
    if (semester._count.projects > 0) {
      throw new SemesterDeletionError(`Este semestre possui ${semester._count.projects} projeto(s) vinculado(s) e não pode ser removido.`);
    }

    return prisma.semester.delete({ where: { id }, select: { id: true, label: true } });
  }

  async open(id: string) {
    return prisma.$transaction(async (tx) => {
      const semester = await tx.semester.findUnique({ where: { id } });
      if (!semester) throw new Error('Semester not found');
      if (semester.status === SemesterStatus.ARCHIVED) throw new Error('Um semestre arquivado não pode ser aberto.');
      const coursesCount = await tx.semesterCourse.count({ where: { semesterId: id } });
      if (!coursesCount) throw new SemesterCourseConfigurationError('Selecione ao menos uma disciplina que receberá projetos antes de abrir o semestre.');
      const courseWithoutTheme = await tx.semesterCourse.findFirst({
        where: { semesterId: id, OR: [{ theme: null }, { theme: '' }] },
        include: { course: { select: { name: true } } },
      });
      if (courseWithoutTheme) {
        throw new SemesterCourseConfigurationError(`Defina o tema da disciplina ${courseWithoutTheme.course.name} antes de abrir o semestre.`);
      }
      await tx.semester.updateMany({ where: { status: SemesterStatus.OPEN, id: { not: id } }, data: { status: SemesterStatus.CLOSED } });
      return tx.semester.update({ where: { id }, data: { status: SemesterStatus.OPEN }, include: semesterDetails });
    });
  }

  async close(id: string) {
    return prisma.semester.update({ where: { id }, data: { status: SemesterStatus.CLOSED }, include: semesterDetails });
  }

  async setCourses(id: string, courses: SemesterCourseInput[]) {
    const uniqueCourses = [...new Map(courses.map((course) => [`${course.courseId}:${course.className.trim().toLowerCase()}`, { ...course, className: course.className.trim() }])).values()];
    if (uniqueCourses.length !== courses.length) throw new SemesterCourseConfigurationError('Uma disciplina não pode ser configurada mais de uma vez no mesmo semestre.');
    const existingCourses = await prisma.course.count({ where: { id: { in: uniqueCourses.map((course) => course.courseId) } } });
    if (existingCourses !== uniqueCourses.length) throw new SemesterCourseConfigurationError('Uma ou mais disciplinas selecionadas não existem.');

    return prisma.$transaction(async (tx) => {
      const semester = await tx.semester.findUnique({ where: { id }, select: { id: true } });
      if (!semester) throw new Error('Semester not found');
      await tx.semesterCourse.deleteMany({ where: { semesterId: id } });
      for (const course of uniqueCourses) {
        const tagNames = [...new Set(course.tags.map((tag) => tag.trim()).filter(Boolean))];
        const semesterCourse = await tx.semesterCourse.create({ data: { semesterId: id, courseId: course.courseId, className: course.className, theme: course.theme.trim() } });
        for (const name of tagNames) {
          const tag = await tx.tag.upsert({ where: { name }, create: { name }, update: {} });
          await tx.semesterCourseTag.create({ data: { semesterId: semesterCourse.semesterId, courseId: semesterCourse.courseId, className: semesterCourse.className, tagId: tag.id } });
        }
      }
      return tx.semester.findUniqueOrThrow({ where: { id }, include: semesterDetails });
    });
  }

  async assertCourseAcceptsProjects(semesterId: string, courseId: string, className: string, tags: string[] = []) {
    const link = await prisma.semesterCourse.findUnique({ where: { semesterId_courseId_className: { semesterId, courseId, className } }, select: { tags: { select: { tag: { select: { name: true } } } } } });
    if (!link) throw new SemesterCourseConfigurationError('Esta turma não está habilitada para receber projetos no semestre aberto.');
    const enabledTags = new Set(link.tags.map(({ tag }) => tag.name));
    const invalidTags = tags.filter((tag) => !enabledTags.has(tag));
    if (invalidTags.length) throw new SemesterCourseConfigurationError(`As tags não estão habilitadas para esta turma: ${invalidTags.join(', ')}.`);
  }
}
