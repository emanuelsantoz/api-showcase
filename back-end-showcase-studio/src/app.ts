import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { projectRoutes } from './modules/routes';
import { env } from './config/env';

const app = new Hono().basePath('/api/v1');

// Middlewares de Segurança
app.use('*', logger());

// CORS configurado para produção
const corsOrigin = env.NODE_ENV === 'production'
  ? process.env.CORS_ORIGIN || 'https://showcase-studio.vercel.app'
  : '*';

app.use('*', cors({
  origin: corsOrigin,
  allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  maxAge: 86400,
}));

// Tratamento de Erros Global do Hono
app.onError((err, c) => {
  console.error(`[Error Handler]: ${err.message}`);

  // Não expor detalhes do erro em produção
  const message = env.NODE_ENV === 'production'
    ? 'Ocorreu um erro inesperado no servidor.'
    : err.message;

  return c.json({
    error: 'Internal Server Error',
    message
  }, 500);
});

// Acoplamento de Módulos
app.route('/projects', projectRoutes);

export default app;