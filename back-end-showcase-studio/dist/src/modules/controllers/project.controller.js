"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProjectController = void 0;
const project_service_1 = require("../services/project.service");
const projectService = new project_service_1.ProjectService();
class ProjectController {
    async getAll(c) {
        const query = c.req.query();
        const page = parseInt(query.page || '1', 10);
        const limit = parseInt(query.limit || '12', 10);
        const isFeatured = query.isFeatured ? query.isFeatured === 'true' : undefined;
        const result = await projectService.listProjects({
            courseId: query.courseId,
            isFeatured,
            page,
            limit,
        });
        return c.json(result, 200);
    }
    async create(c) {
        const body = await c.req.json();
        const project = await projectService.createProject(body);
        return c.json({ message: 'Submissão efetuada com sucesso.', project }, 201);
    }
    async getById(c) {
        const project = await projectService.getProject(c.req.param('id'));
        if (!project)
            return c.json({ error: 'Not Found', message: 'Project not found.' }, 404);
        return c.json({ data: project }, 200);
    }
    async incrementViews(c) {
        const { id } = c.req.param();
        const result = await projectService.incrementViews(id);
        return c.json(result, 200);
    }
    async handleLike(c) {
        const { id } = c.req.param();
        const user = c.get('user');
        const result = await projectService.toggleLike(id, user.id);
        return c.json(result, 200);
    }
    async moderate(c) {
        const { id } = c.req.param();
        const body = await c.req.json();
        const updated = await projectService.updateStatus(id, body.status, body.isFeatured);
        return c.json({ message: 'Status de moderação atualizado.', updated }, 200);
    }
}
exports.ProjectController = ProjectController;
//# sourceMappingURL=project.controller.js.map