# Academic Showcase API

API serverless para Vercel usando Hono, Prisma e PostgreSQL.

## Rotas

- `GET /api/v1/projects` e `GET /api/v1/projects/:id`: projetos aprovados.
- `POST /api/v1/projects`: requer JWT.
- `PATCH /api/v1/projects/:id/view`: contador público de visualizações.
- `POST /api/v1/projects/:id/like`: requer JWT e alterna o like do usuário.
- `PATCH /api/v1/projects/:id/status`: requer papel `ADMIN` ou `COORDENADOR`.
- `GET /api/v1/courses`: lista cursos.
- `POST /api/v1/auth/login`: retorna `{ data: { token, user } }`.
- `GET /api/v1/healthz`: verificação de saúde da Function.

## Produção na Vercel

1. Importe `back-end-showcase-studio` como o diretório-raiz do projeto.
2. Configure `DATABASE_URL`, `DIRECT_URL`, `JWT_SECRET` (32+ caracteres) e `CORS_ORIGIN` nas variáveis de Production.
3. Execute `npx prisma migrate deploy` contra o banco de produção antes do primeiro deploy ou em uma etapa controlada de CI. O build apenas gera o Prisma Client; ele não altera o banco.
4. Faça o deploy. A Vercel detecta automaticamente o Hono a partir de `src/app.ts` e publica suas rotas como Functions Node.js.

Para desenvolver localmente, copie `.env.example` para `.env`, preencha as variáveis e use `npm run dev`. Para simular a Vercel, instale a CLI e execute `npx vercel dev`.
