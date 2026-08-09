import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaClient, Role } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Seed inicial do ambiente real de testes.
 *
 * Este seed é destrutivo por design: remove todos os dados de domínio e recria
 * somente o professor de teste. A confirmação explícita evita uma execução
 * acidental contra um banco de produção.
 */
async function main() {
  if (process.env.SEED_RESET_CONFIRMATION !== 'RESET') {
    throw new Error('Para zerar o banco, defina SEED_RESET_CONFIRMATION=RESET.');
  }

  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? 'emanuelsantossouzajesus@gmail.com';
  const adminPassword = process.env.SEED_ADMIN_PASSWORD;
  if (!adminPassword) {
    throw new Error('Defina SEED_ADMIN_PASSWORD com a senha do administrador antes de executar o seed.');
  }
  const adminPasswordHash = await bcrypt.hash(adminPassword, 12);
  const professorPasswordHash = await bcrypt.hash('123456_temporial', 12);
  const initialTags = ['React', 'TypeScript', 'Node.js', 'Python', 'IA', 'Machine Learning', 'IoT', 'Mobile', 'UI/UX', 'Banco de Dados', 'Cloud', 'DevOps', 'Blockchain', 'AR/VR', 'Sustentabilidade', 'Educação', 'Saúde', 'Cidades Inteligentes'];

  await prisma.$transaction(async (tx) => {
    await tx.like.deleteMany();
    await tx.projectMember.deleteMany();
    await tx.projectContributor.deleteMany();
    await tx.projectReview.deleteMany();
    await tx.projectAccessToken.deleteMany();
    await tx.projectPresentation.deleteMany();
    await tx.project.deleteMany();
    await tx.semesterCourse.deleteMany();
    await tx.tag.deleteMany();
    await tx.course.deleteMany();
    await tx.semester.deleteMany();
    await tx.user.deleteMany();

    const professor = await tx.user.create({
      data: {
        name: 'Administrador da Plataforma',
        email: adminEmail.toLowerCase(),
        password: adminPasswordHash,
        role: Role.ADMIN,
      },
    });

    await tx.user.create({
      data: {
        name: 'Professor de Teste',
        email: 'professor_teste@gmail.com',
        password: professorPasswordHash,
        role: Role.COORDENADOR,
      },
    });

    const course = await tx.course.create({ data: { name: 'Gestão de TI', description: 'Disciplina de gestão e tecnologia da informação.' } });
    await tx.user.update({ where: { id: professor.id }, data: { courseId: course.id } });
    await tx.semester.create({ data: { year: 2026, number: 1, code: '2026.1', label: '1º semestre de 2026', startsAt: new Date('2026-02-01T00:00:00.000Z'), endsAt: new Date('2026-07-31T23:59:59.000Z'), status: 'CLOSED' } });
    const semester = await tx.semester.create({ data: { year: 2026, number: 2, code: '2026.2', label: '2º semestre de 2026', startsAt: new Date('2026-08-01T00:00:00.000Z'), endsAt: new Date('2026-12-31T23:59:59.000Z'), status: 'OPEN' } });
    const tags = await Promise.all(initialTags.map((name) => tx.tag.create({ data: { name } })));
    const semesterCourse = await tx.semesterCourse.create({ data: { semesterId: semester.id, courseId: course.id, className: 'Gestão de TI - S1', theme: 'Tecnologia aplicada à IA' } });
    await tx.semesterCourseTag.createMany({ data: tags.map((tag) => ({ semesterId: semesterCourse.semesterId, courseId: semesterCourse.courseId, className: semesterCourse.className, tagId: tag.id })) });
    await tx.project.create({
      data: {
        title: 'Rotas Inteligentes',
        shortDescription: 'Projeto demonstrativo inicial do portfólio acadêmico.',
        description: 'Projeto inicial para validar o fluxo de publicação, semestre, disciplina, turma e tags.',
        courseId: course.id,
        className: semesterCourse.className,
        semesterId: semester.id,
        createdById: professor.id,
        submitterName: professor.name,
        submitterEmail: professor.email,
        status: 'APPROVED',
        tags: ['IA', 'React', 'TypeScript'],
        liveUrl: 'https://example.com',
      },
    });
  });

  console.log('Banco resetado com sucesso.');
  console.log(`Administrador criado: ${adminEmail}`);
  console.log('Professor criado: professor_teste@gmail.com');
  console.log('Senha temporária: 123456_temporial');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
