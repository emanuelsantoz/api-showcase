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

  const passwordHash = await bcrypt.hash('123456_temporial', 12);

  await prisma.$transaction(async (tx) => {
    await tx.like.deleteMany();
    await tx.projectMember.deleteMany();
    await tx.projectContributor.deleteMany();
    await tx.projectReview.deleteMany();
    await tx.projectAccessToken.deleteMany();
    await tx.projectPresentation.deleteMany();
    await tx.project.deleteMany();
    await tx.semesterCourse.deleteMany();
    await tx.course.deleteMany();
    await tx.semester.deleteMany();
    await tx.user.deleteMany();

    await tx.user.create({
      data: {
        name: 'Professor de Teste',
        email: 'professor_teste@gmail.com',
        password: passwordHash,
        role: Role.COORDENADOR,
      },
    });
  });

  console.log('Banco resetado com sucesso.');
  console.log('Professor criado: professor_teste@gmail.com');
  console.log('Senha temporária: 123456_temporial');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
