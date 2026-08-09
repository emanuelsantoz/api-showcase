import { z } from 'zod';
import 'dotenv/config';

const optionalUrl = z.preprocess(
  (value) => value === '' ? undefined : value,
  z.string().url().optional(),
);

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  DIRECT_URL: z.string().url(),
  PORT: z.string().optional().default('3000'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  CORS_ORIGIN: z.string().optional().default('*'),
  JWT_SECRET: z.string().min(32).optional(),
  MEDIA_STORAGE_PROVIDER: z.enum(['VERCEL_BLOB', 'CLOUDFLARE_R2']).default('VERCEL_BLOB'),
  R2_ACCOUNT_ID: z.string().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_BUCKET_NAME: z.string().optional(),
  R2_PUBLIC_URL: optionalUrl,
});

export const env = envSchema.parse(process.env);
