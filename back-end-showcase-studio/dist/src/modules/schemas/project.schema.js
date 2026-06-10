"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.queryProjectSchema = exports.updateProjectStatusSchema = exports.createProjectSchema = void 0;
const zod_1 = require("zod");
exports.createProjectSchema = zod_1.z.object({
    title: zod_1.z.string().min(5).max(100),
    shortDescription: zod_1.z.string().min(10).max(255),
    description: zod_1.z.string().min(20),
    thumbnailUrl: zod_1.z.string().url().optional(),
    courseId: zod_1.z.string().uuid(),
    membersIds: zod_1.z.array(zod_1.z.string().uuid()).min(1),
});
exports.updateProjectStatusSchema = zod_1.z.object({
    status: zod_1.z.enum(['APPROVED', 'REJECTED', 'PENDING_REVIEW', 'DRAFT']),
    isFeatured: zod_1.z.boolean().optional(),
});
exports.queryProjectSchema = zod_1.z.object({
    courseId: zod_1.z.string().optional(),
    isFeatured: zod_1.z.string().optional(),
    page: zod_1.z.string().optional().default('1'),
    limit: zod_1.z.string().optional().default('12'),
});
//# sourceMappingURL=project.schema.js.map