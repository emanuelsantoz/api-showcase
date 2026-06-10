# 🏗️ Academic Showcase Backend - AI Context Guide

## 🚀 Commands Guide
- Run Development: `npm run dev`
- Build Project: `npm run build`
- Lint & Format: `npm run lint` / `npm run format`
- DB Validation: `npx prisma validate`
- DB Migration Push: `npx prisma db push --accept-data-loss` (only in dev)
- Generate Prisma Client: `npx prisma generate`

## 🧱 Architecture & Patterns
- **Stack**: Hono.js + Prisma ORM + Neon PostgreSQL (PgBouncer / Transaction Mode).
- **Deployment Constraint**: Vercel Free Tier (Serverless/Edge). Max execution time is 10s. Avoid long-running database connections or unoptimized promises.
- **Layers**: Keep a strict separation: Router/Controller -> Service -> Repository.
- **Validation**: Every route payload MUST use `@hono/zod-validator` with explicit Zod schemas.

## 🔐 Domain & RBAC Rules
- **Roles**: `STUDENT`, `COORDENADOR`, `ADMIN`, `VISITOR` (Unauthenticated).
- `STUDENT`: Can create/edit own project drafts and toggle likes.
- `COORDENADOR` / `ADMIN`: Can approve/reject submissions, promote to featured, manage metadata.
- `VISITOR`: Read-only. Accesses public listings and triggers atomic view increments.
- **Metrics**: Likes and views must use atomic database operations (`increment`) to prevent race conditions during traffic peaks.
- **Images**: Do not process raw files. The database only stores public URLs (Supabase Storage/Cloudinary).

## 🛠️ Code Conventions
- Strict TypeScript: `any` is forbidden. Use explicit return types on Services and Repositories.
- API Responses: Standardize structure: `{ success: true, data: X }` or `{ success: false, error: "Msg", code: "ENUM" }`.
- Error Handling: Handle exceptions globally via `app.onError()` or explicitly catch at the controller layer. Return accurate HTTP status codes (401, 403, 422, etc.).

## 📑 API Specifications & OpenAPI
- **Contracts**: Detailed routing and payloads are located in `docs/api-endpoints.md`. ALWAYS read this file before creating or modifying endpoints.
- **Library**: Use `@hono/zod-openapi` instead of native Hono routing.
- **Pattern**: Define routes using `createRoute()`, request validation schemas with `z.object().openapi()`, and register them using an extended `OpenAPIHono` instance.