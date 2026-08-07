import { handle } from 'hono/vercel';
import app from '../src/app';

// Catch-all Vercel Function. Prisma requires the Node.js runtime, which is
// Vercel's default runtime for this function.
export default handle(app);
