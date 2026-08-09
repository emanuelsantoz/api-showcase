import { SemesterStatus } from '@prisma/client';
import { prisma } from '../../db/prisma';

const semesterDetails = {
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
}
