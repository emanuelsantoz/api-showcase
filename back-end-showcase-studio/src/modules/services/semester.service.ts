import { SemesterStatus } from '@prisma/client';
import { prisma } from '../../db/prisma';

const semesterDetails = {
  courses: { include: { course: true }, orderBy: { course: { name: 'asc' } } },
  _count: { select: { projects: { where: { status: 'APPROVED' } } } },
} as const;

export type CreateSemesterInput = {
  year: number;
  number: 1 | 2;
  theme: string;
  startsAt: Date;
  endsAt: Date;
};

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
        theme: input.theme.trim(),
        startsAt: input.startsAt,
        endsAt: input.endsAt,
      },
      include: semesterDetails,
    });
  }

  async open(id: string) {
    return prisma.$transaction(async (tx) => {
      const semester = await tx.semester.findUnique({ where: { id } });
      if (!semester) throw new Error('Semester not found');
      if (semester.status === SemesterStatus.ARCHIVED) throw new Error('Um semestre arquivado não pode ser aberto.');
      if (!semester.theme?.trim()) throw new Error('Defina o tema do semestre antes de abri-lo.');
      const coursesCount = await tx.semesterCourse.count({ where: { semesterId: id } });
      if (!coursesCount) throw new SemesterCourseConfigurationError('Selecione ao menos uma disciplina que receberá projetos antes de abrir o semestre.');
      await tx.semester.updateMany({ where: { status: SemesterStatus.OPEN, id: { not: id } }, data: { status: SemesterStatus.CLOSED } });
      return tx.semester.update({ where: { id }, data: { status: SemesterStatus.OPEN }, include: semesterDetails });
    });
  }

  async close(id: string) {
    return prisma.semester.update({ where: { id }, data: { status: SemesterStatus.CLOSED }, include: semesterDetails });
  }

  async updateTheme(id: string, theme: string) {
    return prisma.semester.update({ where: { id }, data: { theme: theme.trim() || null }, include: semesterDetails });
  }

  async setCourses(id: string, courseIds: string[]) {
    const uniqueCourseIds = [...new Set(courseIds)];
    const existingCourses = await prisma.course.count({ where: { id: { in: uniqueCourseIds } } });
    if (existingCourses !== uniqueCourseIds.length) throw new SemesterCourseConfigurationError('Uma ou mais disciplinas selecionadas não existem.');

    return prisma.$transaction(async (tx) => {
      const semester = await tx.semester.findUnique({ where: { id }, select: { id: true } });
      if (!semester) throw new Error('Semester not found');
      await tx.semesterCourse.deleteMany({ where: { semesterId: id } });
      if (uniqueCourseIds.length) {
        await tx.semesterCourse.createMany({ data: uniqueCourseIds.map((courseId) => ({ semesterId: id, courseId })) });
      }
      return tx.semester.findUniqueOrThrow({ where: { id }, include: semesterDetails });
    });
  }

  async assertCourseAcceptsProjects(semesterId: string, courseId: string) {
    const link = await prisma.semesterCourse.findUnique({ where: { semesterId_courseId: { semesterId, courseId } }, select: { semesterId: true } });
    if (!link) throw new SemesterCourseConfigurationError('Esta disciplina não está habilitada para receber projetos no semestre aberto.');
  }
}
