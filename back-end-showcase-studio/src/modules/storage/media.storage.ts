import { del, put } from '@vercel/blob';
import { DeleteObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { env } from '../../config/env';
import type { StorageProvider } from '@prisma/client';

export type UploadableMedia = {
  arrayBuffer(): Promise<ArrayBuffer>;
  type: string;
  size: number;
};

export type StoredMedia = {
  url: string;
  key: string;
  provider: StorageProvider;
};

function r2Config() {
  if (!env.R2_ACCOUNT_ID || !env.R2_ACCESS_KEY_ID || !env.R2_SECRET_ACCESS_KEY || !env.R2_BUCKET_NAME || !env.R2_PUBLIC_URL) {
    throw new Error('Cloudflare R2 environment variables are not configured.');
  }
  return {
    bucket: env.R2_BUCKET_NAME,
    publicUrl: env.R2_PUBLIC_URL.replace(/\/$/, ''),
    client: new S3Client({
      region: 'auto',
      endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId: env.R2_ACCESS_KEY_ID, secretAccessKey: env.R2_SECRET_ACCESS_KEY },
    }),
  };
}

export async function uploadMedia(key: string, file: UploadableMedia, provider: StorageProvider): Promise<StoredMedia> {
  const bytes = Buffer.from(await file.arrayBuffer());

  if (provider === 'CLOUDFLARE_R2') {
    const r2 = r2Config();
    await r2.client.send(new PutObjectCommand({ Bucket: r2.bucket, Key: key, Body: bytes, ContentType: file.type }));
    return { url: `${r2.publicUrl}/${key.split('/').map(encodeURIComponent).join('/')}`, key, provider };
  }

  const blob = await put(key, bytes, { access: 'public', contentType: file.type, addRandomSuffix: false, allowOverwrite: true });
  return { url: blob.url, key, provider: 'VERCEL_BLOB' };
}

export async function deleteMedia(provider: StorageProvider, keyOrUrl: string | null | undefined) {
  if (!keyOrUrl || provider === 'CANVA') return;
  if (provider === 'CLOUDFLARE_R2') {
    const r2 = r2Config();
    await r2.client.send(new DeleteObjectCommand({ Bucket: r2.bucket, Key: keyOrUrl }));
    return;
  }
  await del(keyOrUrl);
}
