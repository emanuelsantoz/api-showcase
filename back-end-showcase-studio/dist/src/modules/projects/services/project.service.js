"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProjectService = void 0;
const prisma_1 = require("../../../db/prisma");
const client_1 = require("@prisma/client");
class ProjectService {
    async listProjects(filters) {
        const skip = (filters.page - 1) * filters.limit;
        const whereClause = { status: client_1.ProjectStatus.APPROVED };
        if (filters.courseId)
            whereClause.courseId = filters.courseId;
        if (filters.isFeatured !== undefined)
            whereClause.isFeatured = filters.isFeatured;
        const [projects, total] = await prisma_1.prisma.$transaction([
            prisma_1.prisma.project.findMany({
                where: whereClause,
                skip,
                take: filters.limit,
                include: {
                    course: true,
                    members: { include: { user: { select: { id: true, name: true } } } },
                    _count: { select: { likes: true } }
                },
                orderBy: { createdAt: 'desc' },
            }),
            prisma_1.prisma.project.count({ where: whereClause }),
        ]);
        return {
            data: projects,
            meta: {
                total,
                page: filters.page,
                limit: filters.limit,
                totalPages: Math.ceil(total / filters.limit),
            },
        };
    }
    async createProject(data, ownerId) {
        const allMembers = Array.from(new Set([ownerId, ...data.membersIds]));
        return await prisma_1.prisma.project.create({
            data: {
                title: data.title,
                shortDescription: data.shortDescription,
                description: data.description,
                thumbnailUrl: data.thumbnailUrl,
                courseId: data.courseId,
                status: client_1.ProjectStatus.PENDING_REVIEW,
                members: {
                    create: allMembers.map((userId) => ({
                        userId,
                        roleInfo: userId === ownerId ? 'Leader' : 'Contributor',
                    })),
                },
            },
        });
    }
    async incrementViews(id) {
        return await prisma_1.prisma.project.update({
            where: { id },
            data: { viewsCount: { increment: 1 } },
            select: { id: true, viewsCount: true },
        });
    }
    async toggleLike(projectId, userId) {
        const existingLike = await prisma_1.prisma.like.findUnique({
            where: { userId_projectId: { userId, projectId } },
        });
        if (existingLike) {
            await prisma_1.prisma.like.delete({ where: { userId_projectId: { userId, projectId } } });
            return { liked: false };
        }
        await prisma_1.prisma.like.create({ data: { userId, projectId } });
        return { liked: true };
    }
    async updateStatus(id, status, isFeatured) {
        return await prisma_1.prisma.project.update({
            where: { id },
            data: {
                status,
                ...(isFeatured !== undefined && { isFeatured }),
            },
        });
    }
}
exports.ProjectService = ProjectService;
//# sourceMappingURL=project.service.js.map