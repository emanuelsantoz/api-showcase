import { SemesterStatus } from '@prisma/client';
import { prisma } from '../../db/prisma';

const semesterDetails = {
  courses: { include: { course: true }, orderBy: { course: { name: 'asc' } } },
  _count: { select: { projects: { where: { status: 'APPROVED' } } } },
} as const;

export type CreateSemesterInput = {
  year: number;
  number: 1 | 2;
  startsAt: Date;
  endsAt: Date;
};

export type SemesterCourseInput = { courseId: string; className: string; theme: string };

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
      if (uniqueCourses.length) {
        await tx.semesterCourse.createMany({ data: uniqueCourses.map((course) => ({ semesterId: id, courseId: course.courseId, className: course.className, theme: course.theme.trim() })) });
      }
      return tx.semester.findUniqueOrThrow({ where: { id }, include: semesterDetails });
    });
  }

  async assertCourseAcceptsProjects(semesterId: string, courseId: string, className: string) {
    const link = await prisma.semesterCourse.findUnique({ where: { semesterId_courseId_className: { semesterId, courseId, className } }, select: { semesterId: true } });
    if (!link) throw new SemesterCourseConfigurationError('Esta turma não está habilitada para receber projetos no semestre aberto.');
  }
}
