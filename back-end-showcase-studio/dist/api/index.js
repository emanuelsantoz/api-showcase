"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DELETE = exports.PUT = exports.PATCH = exports.POST = exports.GET = exports.config = void 0;
const vercel_1 = require("hono/vercel");
const app_1 = __importDefault(require("../src/app"));
exports.config = {
    runtime: 'edge', // Garante execução no Edge para latência ultrabaixa
};
exports.GET = (0, vercel_1.handle)(app_1.default);
exports.POST = (0, vercel_1.handle)(app_1.default);
exports.PATCH = (0, vercel_1.handle)(app_1.default);
exports.PUT = (0, vercel_1.handle)(app_1.default);
exports.DELETE = (0, vercel_1.handle)(app_1.default);
//# sourceMappingURL=index.js.map