"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.projectRoutes = void 0;
const hono_1 = require("hono");
const jwt_1 = require("hono/jwt");
const zod_validator_1 = require("@hono/zod-validator");
const project_controller_1 = require("./controllers/project.controller");
const project_schema_1 = require("./schemas/project.schema");
const env_1 = require("../../config/env");
const router = new hono_1.Hono();
const controller = new project_controller_1.ProjectController();
const authMiddleware = (0, jwt_1.jwt)({ secret: env_1.env.JWT_SECRET, alg: 'HS256' });
router.get('/', (0, zod_validator_1.zValidator)('query', project_schema_1.queryProjectSchema, (result, c) => {
    if (!result.success) {
        return c.json({ error: 'Invalid query parameters', details: result.error }, 400);
    }
}), controller.getAll);
router.patch('/:id/view', controller.incrementViews);
// Rotas Protegidas por Autenticação (Alunos e Professores)
router.post('/', authMiddleware, (0, zod_validator_1.zValidator)('json', project_schema_1.createProjectSchema), controller.create);
router.post('/:id/like', authMiddleware, controller.handleLike);
// Rotas Administrativas (Moderação)
router.patch('/:id/status', authMiddleware, (0, zod_validator_1.zValidator)('json', project_schema_1.updateProjectStatusSchema), controller.moderate);
exports.projectRoutes = router;
//# sourceMappingURL=routes.js.map