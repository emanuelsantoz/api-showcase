import { serve } from '@hono/node-server';
import app from './app';
import { env } from './config/env';

console.log(`🚀 Servidor do Academic Showcase iniciado na porta ${env.PORT}`);

serve({
  fetch: app.fetch,
  port: Number(env.PORT),
});