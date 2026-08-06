"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vercel_1 = require("hono/vercel");
const app_1 = __importDefault(require("../src/app"));
// Prisma requires the Node.js runtime. Vercel Functions use it by default.
exports.default = (0, vercel_1.handle)(app_1.default);
//# sourceMappingURL=index.js.map