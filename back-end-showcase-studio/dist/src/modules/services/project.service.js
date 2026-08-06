"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProjectService = void 0;
const prisma_1 = require("../../db/prisma");
const client_1 = require("@prisma/client");
const details = {
    course: true,
    members: { include: { user: { select: { id: true, name: true } } } },
    _count: { select: { likes: true } },
};
class ProjectService {
    async listProjects(filters) {
        const skip = (filters.page - 1) * filters.limit;
        const where = { status: client_1.ProjectStatus.APPROVED };
        if (filters.courseId)
            where.courseId = filters.courseId;
        if (filters.isFeatured !== undefined)
            where.isFeatured = filters.isFeatured;
        const [projects, total] = await prisma_1.prisma.$transaction([
            prisma_1.prisma.project.findMany({ where, skip, take: filters.limit, include: details, orderBy: { createdAt: 'desc' } }),
            prisma_1.prisma.project.count({ where }),
        ]);
        return { data: projects, meta: { total, page: filters.page, limit: filters.limit, totalPages: Math.ceil(total / filters.limit) } };
    }
    async getProject(id) {
        return prisma_1.prisma.project.findFirst({ where: { id, status: client_1.ProjectStatus.APPROVED }, include: details });
    }
    async createProject(data) {
        return prisma_1.prisma.project.create({
            data: {
                title: data.title, shortDescription: data.shortDescription, description: data.description,
                thumbnailUrl: data.thumbnailUrl, courseId: data.courseId, status: client_1.ProjectStatus.PENDING_REVIEW,
                members: { create: data.membersIds.map((userId) => ({ userId, roleInfo: 'Contributor' })) },
            },
        });
    }
    async incrementViews(id) {
        return prisma_1.prisma.project.update({ where: { id }, data: { viewsCount: { increment: 1 } }, select: { id: true, viewsCount: true } });
    }
    async toggleLike(projectId, userId) {
        return prisma_1.prisma.$transaction(async (tx) => {
            const project = await tx.project.findUnique({ where: { id: projectId }, select: { likesCount: true } });
            if (!project)
                throw new Error('Project not found');
            const like = await tx.like.findUnique({ where: { userId_projectId: { userId, projectId } } });
            const liked = !like;
            if (like) {
                await tx.like.delete({ where: { userId_projectId: { userId, projectId } } });
                await tx.project.update({ where: { id: projectId }, data: { likesCount: { decrement: 1 } } });
            }
            else {
                await tx.like.create({ data: { userId, projectId } });
                await tx.project.update({ where: { id: projectId }, data: { likesCount: { increment: 1 } } });
            }
            return { liked, likesCount: project.likesCount + (liked ? 1 : -1) };
        });
    }
    async updateStatus(id, status, isFeatured) {
        return prisma_1.prisma.project.update({ where: { id }, data: { status, ...(isFeatured !== undefined && { isFeatured }) } });
    }
}
exports.ProjectService = ProjectService;
//# sourceMappingURL=project.service.js.map