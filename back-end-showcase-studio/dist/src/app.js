"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const hono_1 = require("hono");
const cors_1 = require("hono/cors");
const logger_1 = require("hono/logger");
const routes_1 = require("./modules/routes");
const courses_routes_1 = require("./modules/courses.routes");
const auth_routes_1 = require("./modules/auth.routes");
const env_1 = require("./config/env");
const app = new hono_1.Hono().basePath('/api/v1');
// Middlewares de Segurança
app.use('*', (0, logger_1.logger)());
// CORS configurado para produção
const corsOrigin = env_1.env.NODE_ENV === 'production'
    ? process.env.CORS_ORIGIN || 'https://showcase-studio.vercel.app'
    : '*';
app.use('*', (0, cors_1.cors)({
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
    const message = env_1.env.NODE_ENV === 'production'
        ? 'Ocorreu um erro inesperado no servidor.'
        : err.message;
    return c.json({
        error: 'Internal Server Error',
        message
    }, 500);
});
// Acoplamento de Módulos
app.route('/projects', routes_1.projectRoutes);
app.route('/courses', courses_routes_1.courseRoutes);
app.route('/auth', auth_routes_1.authRoutes);
exports.default = app;
//# sourceMappingURL=app.js.map