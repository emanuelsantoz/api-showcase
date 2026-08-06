"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.projectRoutes = void 0;
const hono_1 = require("hono");
const zod_validator_1 = require("@hono/zod-validator");
const project_controller_1 = require("./controllers/project.controller");
const project_schema_1 = require("./schemas/project.schema");
const auth_1 = require("./auth");
const router = new hono_1.Hono();
const controller = new project_controller_1.ProjectController();
// Rotas Públicas
router.get('/', (0, zod_validator_1.zValidator)('query', project_schema_1.queryProjectSchema, (result, c) => {
    if (!result.success) {
        return c.json({ error: 'Invalid query parameters', details: result.error }, 400);
    }
}), controller.getAll);
router.get('/:id', controller.getById);
router.patch('/:id/view', controller.incrementViews);
// Rotas de Projeto (criação, like, moderação)
router.post('/', auth_1.requireAuth, (0, zod_validator_1.zValidator)('json', project_schema_1.createProjectSchema), controller.create);
router.post('/:id/like', auth_1.requireAuth, controller.handleLike);
router.patch('/:id/status', auth_1.requireAuth, auth_1.requireModerator, (0, zod_validator_1.zValidator)('json', project_schema_1.updateProjectStatusSchema), controller.moderate);
exports.projectRoutes = router;
//# sourceMappingURL=routes.js.map