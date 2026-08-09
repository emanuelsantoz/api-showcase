import 'dotenv/config';
import bcrypt from 'bcryptjs';
import {
  PrismaClient,
  ProjectStatus,
  Role,
  SemesterStatus,
  StorageProvider,
} from '@prisma/client';

const prisma = new PrismaClient();

type MockProject = {
  id: string;
  title: string;
  shortDescription: string;
  description: string;
  category: string;
  cover: string;
  date: string;
  semesterCode: string;
  likes: number;
  views: number;
  tags?: string[];
  liveUrl?: string;
  prototypeUrl?: string;
  repositoryUrl?: string;
  featured?: boolean;
  members: Array<{ name: string; role: string }>;
  canvaUrl?: string;
};

const semesterSeed = [
  { year: 2024, number: 1, theme: 'Fundamentos para a transformação digital' },
  { year: 2024, number: 2, theme: 'Soluções tecnológicas para a sociedade' },
  { year: 2025, number: 1, theme: 'Educação, sustentabilidade e inovação' },
  { year: 2025, number: 2, theme: 'Tecnologia e inovação aplicada' },
] as const;

const mockProjects: MockProject[] = [
  {
    id: 'mock-project-p1',
    title: 'Sistema de Gestão Acadêmica Distribuída',
    shortDescription: 'Plataforma escalável para gerenciamento de matrículas, turmas e desempenho com arquitetura de microsserviços.',
    description: 'Projeto desenvolvido para repensar a experiência de secretarias acadêmicas em instituições de grande porte. A arquitetura em microsserviços permite alta disponibilidade, escalonamento independente por domínio e integração com sistemas legados via gateway de eventos. O front-end foi construído em React com foco em acessibilidade WCAG 2.1 AA.',
    category: 'Engenharia de Software',
    cover: 'https://images.unsplash.com/photo-1551434678-e076c223a692?w=1200&q=80',
    date: '2025-11-15T12:00:00.000Z', semesterCode: '2025.2', likes: 482, views: 12340, featured: true,
    tags: ['React', 'Node.js', 'Microsserviços', 'PostgreSQL'],
    liveUrl: 'https://example.com/gestao-academica', prototypeUrl: 'https://www.figma.com/proto/example', repositoryUrl: 'https://github.com/example/gestao',
    members: [{ name: 'Ana Beatriz', role: 'Tech Lead' }, { name: 'Lucas Pereira', role: 'Back-end' }, { name: 'Mariana Souza', role: 'UX & Front-end' }],
  },
  {
    id: 'mock-project-p2',
    title: 'Visão Computacional para Triagem Hospitalar',
    shortDescription: 'Modelo de IA que prioriza atendimentos com base em sinais visuais e dados vitais em tempo real.',
    description: 'Solução de apoio à decisão clínica que combina visão computacional com leitura de sinais vitais via dispositivos IoT. O modelo foi treinado com dados anonimizados e validado em parceria com hospital-escola.',
    category: 'Inteligência Artificial',
    cover: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=1200&q=80',
    date: '2025-10-02T12:00:00.000Z', semesterCode: '2025.2', likes: 651, views: 21405, featured: true,
    tags: ['Python', 'PyTorch', 'Visão Computacional', 'Saúde'], liveUrl: 'https://example.com/triagem-ia',
    members: [{ name: 'Rafael Oliveira', role: 'ML Engineer' }, { name: 'Júlia Mendes', role: 'Pesquisa Clínica' }],
    canvaUrl: 'https://www.canva.com/design/DAHKVsyA8n0/F6aEWXGPD5zpcxrrNEV5Zg/view?embed',
  },
  {
    id: 'mock-project-p3', title: 'Cidade Inteligente — Sensoriamento Urbano',
    shortDescription: 'Rede LoRa de sensores ambientais com dashboard analítico para municípios de pequeno porte.',
    description: 'Projeto de sensoriamento urbano que combina dispositivos LoRa, monitoramento ambiental e um dashboard analítico para a tomada de decisão municipal.',
    category: 'IoT', cover: 'https://images.unsplash.com/photo-1581291518857-4e27b48ff24e?w=1200&q=80',
    date: '2025-09-20T12:00:00.000Z', semesterCode: '2025.2', likes: 312, views: 8740,
    members: [{ name: 'Pedro Lima', role: 'Hardware' }, { name: 'Camila Rocha', role: 'Dados' }, { name: 'Vinícius Alves', role: 'Back-end' }],
  },
  {
    id: 'mock-project-p4', title: 'Plataforma de Aprendizagem Imersiva em VR',
    shortDescription: 'Laboratórios virtuais de química e física para alunos do ensino técnico em ambientes imersivos.',
    description: 'Laboratórios imersivos que permitem a estudantes do ensino técnico explorar experiências de química e física com segurança e colaboração.',
    category: 'Realidade Virtual', cover: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200&q=80',
    date: '2025-06-12T12:00:00.000Z', semesterCode: '2025.1', likes: 524, views: 17200, featured: true,
    members: [{ name: 'Beatriz Cardoso', role: '3D Artist' }, { name: 'Henrique Tavares', role: 'VR Developer' }],
  },
  {
    id: 'mock-project-p5', title: 'Marketplace Sustentável de Resíduos',
    shortDescription: 'Aplicação web que conecta cooperativas de reciclagem a empresas geradoras de resíduos recicláveis.',
    description: 'Marketplace que aproxima cooperativas de reciclagem e empresas, organizando a coleta e a comercialização de resíduos recicláveis.',
    category: 'Desenvolvimento Web', cover: 'https://images.unsplash.com/photo-1531297484001-80022131f5a1?w=1200&q=80',
    date: '2025-05-28T12:00:00.000Z', semesterCode: '2025.1', likes: 289, views: 6420,
    members: [{ name: 'Diego Martins', role: 'Full-stack' }, { name: 'Larissa Pinto', role: 'Product Design' }],
  },
  {
    id: 'mock-project-p6', title: 'Análise Preditiva de Evasão Escolar',
    shortDescription: 'Modelo estatístico que identifica padrões de risco e sugere intervenções pedagógicas personalizadas.',
    description: 'Modelo preditivo para identificar sinais de evasão escolar e apoiar intervenções pedagógicas personalizadas de forma responsável.',
    category: 'Ciência de Dados', cover: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=1200&q=80',
    date: '2025-03-14T12:00:00.000Z', semesterCode: '2025.1', likes: 401, views: 11890,
    members: [{ name: 'Felipe Andrade', role: 'Data Scientist' }, { name: 'Natália Ribeiro', role: 'Pesquisa' }],
  },
  {
    id: 'mock-project-p7', title: 'Robô Autônomo para Inspeção Industrial',
    shortDescription: 'Veículo autônomo com SLAM para inspeção de tubulações e estruturas industriais de difícil acesso.',
    description: 'Veículo autônomo com SLAM para inspecionar estruturas industriais de difícil acesso e reduzir riscos operacionais.',
    category: 'Robótica', cover: 'https://images.unsplash.com/photo-1542831371-29b0f74f9713?w=1200&q=80',
    date: '2024-11-18T12:00:00.000Z', semesterCode: '2024.2', likes: 712, views: 24560, featured: true,
    members: [{ name: 'Gustavo Neves', role: 'Robótica' }, { name: 'Isabela Cunha', role: 'Eletrônica' }, { name: 'Thiago Barros', role: 'Software Embarcado' }],
  },
  {
    id: 'mock-project-p8', title: 'Design System Acadêmico Open Source',
    shortDescription: 'Biblioteca de componentes acessíveis padronizando interfaces de sistemas internos da instituição.',
    description: 'Biblioteca de componentes acessíveis para padronizar produtos digitais e sistemas internos da instituição.',
    category: 'Design de Interação', cover: 'https://images.unsplash.com/photo-1531297484001-80022131f5a1?w=1200&q=80',
    date: '2024-09-02T12:00:00.000Z', semesterCode: '2024.2', likes: 198, views: 5340,
    members: [{ name: 'Sofia Almeida', role: 'Design System' }],
  },
  {
    id: 'mock-project-p9', title: 'Blockchain para Diplomas Digitais',
    shortDescription: 'Emissão e verificação de diplomas acadêmicos em rede distribuída com selo criptográfico imutável.',
    description: 'Solução para emissão e verificação de diplomas acadêmicos em rede distribuída com rastreabilidade e selo criptográfico.',
    category: 'Engenharia de Software', cover: 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=1200&q=80',
    date: '2024-05-20T12:00:00.000Z', semesterCode: '2024.1', likes: 367, views: 9820,
    members: [{ name: 'Bruno Faria', role: 'Blockchain' }, { name: 'Letícia Gomes', role: 'Back-end' }],
  },
];

const slug = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '.').replace(/^\.|\.$/g, '');

function semesterDates(year: number, number: 1 | 2) {
  const startsAt = new Date(Date.UTC(year, number === 1 ? 1 : 7, 1));
  const endsAt = new Date(Date.UTC(year, number === 1 ? 6 : 11, number === 1 ? 31 : 31, 23, 59, 59));
  return { startsAt, endsAt };
}

async function main() {
  const adminPassword = process.env.SEED_ADMIN_PASSWORD;
  if (!adminPassword) throw new Error('Defina SEED_ADMIN_PASSWORD antes de executar o seed.');
  const passwordHash = await bcrypt.hash(adminPassword, 12);

  const coordinator = await prisma.user.upsert({
    where: { email: 'helena.ramos@creativelab.local' },
    update: { name: 'Profa. Dra. Helena Ramos', role: Role.COORDENADOR, password: passwordHash },
    create: { name: 'Profa. Dra. Helena Ramos', email: 'helena.ramos@creativelab.local', role: Role.COORDENADOR, password: passwordHash },
  });

  const courses = new Map<string, string>();
  for (const name of [...new Set(mockProjects.map((project) => project.category))]) {
    const course = await prisma.course.upsert({ where: { name }, update: {}, create: { name, description: `Projetos da área de ${name}.` } });
    courses.set(name, course.id);
  }

  const semesters = new Map<string, string>();
  for (const item of semesterSeed) {
    const code = `${item.year}.${item.number}`;
    const dates = semesterDates(item.year, item.number);
    const semester = await prisma.semester.upsert({
      where: { code },
      update: { label: `${item.number}º semestre de ${item.year}`, theme: item.theme, startsAt: dates.startsAt, endsAt: dates.endsAt, status: SemesterStatus.CLOSED },
      create: { year: item.year, number: item.number, code, label: `${item.number}º semestre de ${item.year}`, theme: item.theme, startsAt: dates.startsAt, endsAt: dates.endsAt, status: SemesterStatus.CLOSED },
    });
    semesters.set(code, semester.id);
  }

  for (const project of mockProjects) {
    const courseId = courses.get(project.category)!;
    const semesterId = semesters.get(project.semesterCode)!;
    const members = await Promise.all(project.members.map(async (member) => {
      const email = `${slug(member.name)}@students.creativelab.local`;
      return prisma.user.upsert({
        where: { email },
        update: { name: member.name, role: Role.STUDENT, courseId },
        create: { name: member.name, email, password: passwordHash, role: Role.STUDENT, courseId },
      });
    }));
    const lead = members[0]!;
    const createdAt = new Date(project.date);

    await prisma.project.upsert({
      where: { id: project.id },
      update: {
        title: project.title, shortDescription: project.shortDescription, description: project.description,
        courseId, semesterId, createdById: lead.id, submitterName: lead.name, submitterEmail: lead.email,
        thumbnailUrl: project.cover, thumbnailStorageProvider: null, thumbnailStorageKey: null,
        tags: project.tags ?? [project.category], liveUrl: project.liveUrl, prototypeUrl: project.prototypeUrl, repositoryUrl: project.repositoryUrl,
        status: ProjectStatus.APPROVED, isFeatured: Boolean(project.featured), likesCount: project.likes, viewsCount: project.views,
        createdAt,
      },
      create: {
        id: project.id, title: project.title, shortDescription: project.shortDescription, description: project.description,
        courseId, semesterId, createdById: lead.id, submitterName: lead.name, submitterEmail: lead.email,
        thumbnailUrl: project.cover, status: ProjectStatus.APPROVED, isFeatured: Boolean(project.featured), likesCount: project.likes, viewsCount: project.views,
        tags: project.tags ?? [project.category], liveUrl: project.liveUrl, prototypeUrl: project.prototypeUrl, repositoryUrl: project.repositoryUrl,
        createdAt,
      },
    });

    await prisma.projectMember.deleteMany({ where: { projectId: project.id } });
    await prisma.projectMember.createMany({ data: members.map((member, index) => ({ projectId: project.id, userId: member.id, roleInfo: project.members[index]!.role })) });

    if (project.canvaUrl) {
      await prisma.projectPresentation.upsert({
        where: { projectId: project.id },
        update: { type: 'CANVA', url: project.canvaUrl, storageProvider: StorageProvider.CANVA, storageKey: null, contentType: null, sizeBytes: null },
        create: { projectId: project.id, type: 'CANVA', url: project.canvaUrl, storageProvider: StorageProvider.CANVA },
      });
    }
  }

  console.log(`Seed concluído: ${mockProjects.length} projetos, ${courses.size} cursos e ${semesters.size} semestres.`);
  console.log(`Coordenadora: ${coordinator.email}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}).finally(() => prisma.$disconnect());
