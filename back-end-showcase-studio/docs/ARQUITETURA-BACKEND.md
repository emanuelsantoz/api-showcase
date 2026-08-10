# Arquitetura do Back-end — Creative Lab

## Objetivo

API REST para submissão, curadoria e publicação de projetos acadêmicos. É uma aplicação Hono em uma única função serverless da Vercel, com diversas rotas e serviços internos. O banco é PostgreSQL no Neon via Prisma.

## Stack

- Node.js 22 na Vercel.
- Hono + Zod para HTTP e validação.
- Prisma 5 + Neon PostgreSQL.
- JWT e bcrypt para autenticação administrativa.
- Cloudflare R2, compatível com S3, para thumbnails e avatares.
- Vercel Blob para PDFs.

## Entrada e implantação

- `src/app.ts`: cria a aplicação com base `/api/v1`, CORS, tratamento centralizado de erros e registro das rotas.
- `api/index.ts`/`vercel.json`: adaptam a aplicação para a Function da Vercel.
- `src/server.ts`: somente desenvolvimento local com `@hono/node-server`.
- Build: `prisma generate && tsc --noEmit`.

## Módulos

| Módulo | Responsabilidade |
| --- | --- |
| `auth` | Login de administrador/professor, JWT e guards de role. |
| `projects` | Catálogo público, edição, mídia, visualizações, likes e status. |
| `public/submissions` | Submissão anônima e reenvio por token temporário. |
| `moderation` | Aprovação, rejeição e solicitação de correções. |
| `semesters` | Períodos, disciplinas, turmas, tema e tags liberadas. |
| `courses` | Cursos/disciplinas e catálogo de tags. |
| `users` | Perfis administrativos e professores. |
| `dashboard` | Indicadores agregados do painel. |

## Modelo de domínio

- `User`: administrador, coordenador/professor ou estudante; os visitantes não precisam de conta.
- `Semester`: período acadêmico (`DRAFT`, `OPEN`, `CLOSED`, `ARCHIVED`).
- `Course` e `SemesterCourse`: disciplina/curso, turma, tema e tags permitidas por semestre.
- `Project`: submissão, links, status, contadores, tags e referência à mídia.
- `ProjectPresentation`: Canva, PowerPoint ou PDF.
- `ProjectContributor`: integrantes informados no formulário público.
- `ProjectReview` e `ProjectAccessToken`: histórico de curadoria e acesso temporário para correções.

## Regras centrais

1. O aluno só submete para uma configuração `SemesterCourse` de semestre aberto e que esteja recebendo projetos.
2. O semestre é inferido no servidor; o cliente não escolhe o período livremente.
3. Projetos só aparecem publicamente no status `APPROVED`.
4. Professor/administrador só podem editar projetos que possam gerenciar; a regra é reforçada pelo back-end.
5. Alterações solicitadas geram token temporário e e-mail para o responsável.
6. A combinação semestre + disciplina + turma deve existir ao editar os metadados de um projeto.

## Armazenamento de mídia

| Mídia | Provedor | Chave |
| --- | --- | --- |
| Thumbnail | Cloudflare R2 | `projects/{id}/thumbnail` |
| Avatar de responsável/integrante | Cloudflare R2 | `projects/{id}/...` |
| PDF | Vercel Blob | `projects/{id}/presentation.pdf` |
| Canva/PowerPoint | Link externo | URL de incorporação |

O serviço de mídia apaga o objeto anterior quando uma thumbnail ou PDF é substituído. URLs públicas são armazenadas junto da chave e do provedor.

## Variáveis de ambiente obrigatórias

- `DATABASE_URL`, `DIRECT_URL`
- `JWT_SECRET`
- `CORS_ORIGIN`, `FRONTEND_URL`
- `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_PUBLIC_URL`
- Token da Vercel Blob configurado no ambiente da Function

Para e-mail de correção: `RESEND_API_KEY` e `EMAIL_FROM`.

## Métricas e engajamento — fase final

### Visualizações

`PATCH /projects/:id/view` é público e usa incremento atômico em `viewsCount`. O front chama o endpoint somente uma vez por projeto por sessão de navegador. O contador não é uma ferramenta de auditoria nem mede visitantes únicos globais; é uma métrica de interesse do MVP.

### Likes anônimos

O modelo antigo `Like(userId, projectId)` exige login e não atende o produto. Será substituído por uma chave anônima:

- cliente cria `visitorId` aleatório em `localStorage`;
- a API recebe a chave e grava apenas seu hash criptográfico;
- índice único por `(projectId, visitorHash)`;
- endpoint público alterna like/deslike e ajusta `likesCount` em transação;
- não são persistidos nome, e-mail, senha ou IP como identidade de curtida.

### Destaques

- Seleção editorial: `Project.isFeatured`, alterada por moderador na Curadoria.
- Complemento automático: ranking de projetos aprovados por `viewsCount + likesCount × 5`, com desempate por data de criação.
- O ranking é calculado na consulta, portanto cada incremento de visualização tem efeito imediato sem cron, fila ou nova tabela.

## Operação

- Aplicar migrations em produção: `npm run prisma:migrate`.
- Gerar client: `npm run prisma:generate`.
- Carga inicial explícita: `npm run db:seed`.
- Carga de tags: `npm run db:seed:tags`.
- Não executar seed de limpeza em produção sem validar o alvo do banco.
