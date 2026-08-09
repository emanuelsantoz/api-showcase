import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const tags = [
  'React', 'TypeScript', 'Node.js', 'Python', 'IA', 'Machine Learning',
  'IoT', 'Mobile', 'UI/UX', 'Banco de Dados', 'Cloud', 'DevOps',
  'Blockchain', 'AR/VR', 'Sustentabilidade', 'Educação', 'Saúde',
  'Cidades Inteligentes', 'ERP', 'B2B',
];

async function main() {
  for (const name of tags) {
    await prisma.tag.upsert({ where: { name }, create: { name }, update: {} });
  }
  console.log(`${tags.length} tags cadastradas ou já existentes.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
