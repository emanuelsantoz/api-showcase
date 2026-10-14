import dotenv from 'dotenv';
import { PutBucketCorsCommand, S3Client } from '@aws-sdk/client-s3';

dotenv.config({ path: process.env.R2_ENV_FILE ?? '.env' });

const required = ['R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET_NAME'] as const;
for (const key of required) {
  if (!process.env[key]) throw new Error(`Missing ${key}.`);
}

const client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

async function configureCors() {
  await client.send(new PutBucketCorsCommand({
    Bucket: process.env.R2_BUCKET_NAME!,
    CORSConfiguration: {
      CORSRules: [{
        AllowedOrigins: ['https://criativelab.tech', 'https://www.criativelab.tech'],
        AllowedMethods: ['GET', 'HEAD', 'PUT'],
        AllowedHeaders: ['content-type'],
        ExposeHeaders: ['ETag'],
        MaxAgeSeconds: 3600,
      }],
    },
  }));
  console.log('R2 CORS configured for Criative Lab.');
}

configureCors().catch((error) => {
  console.error('Unable to configure R2 CORS.', error);
  process.exitCode = 1;
});
