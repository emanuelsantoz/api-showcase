"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
const zod_1 = require("zod");
require("dotenv/config");
const envSchema = zod_1.z.object({
    DATABASE_URL: zod_1.z.string().url(),
    DIRECT_URL: zod_1.z.string().url(),
    PORT: zod_1.z.string().optional().default('3000'),
    NODE_ENV: zod_1.z.enum(['development', 'production', 'test']).default('development'),
    CORS_ORIGIN: zod_1.z.string().optional().default('*'),
    JWT_SECRET: zod_1.z.string().min(32).optional(),
});
exports.env = envSchema.parse(process.env);
//# sourceMappingURL=env.js.map