import { handle } from 'hono/vercel';
import app from '../src/app';

// Prisma requires the Node.js runtime. Vercel Functions use it by default.
export default handle(app);
