import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { GetObjectCommand, HeadObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { env } from '../../config/env';
import { assertImageSignature, assertPdfSignature } from './media-validation';
import { getR2StorageConfig, type UploadableMedia } from './media.storage';

export type DirectUploadKind = 'THUMBNAIL' | 'SUBMITTER_AVATAR' | 'CONTRIBUTOR_AVATAR' | 'PRESENTATION_PDF';

export type DirectUploadRequest = {
  id: string;
  kind: DirectUploadKind;
  contentType: string;
  size: number;
};

export type DirectUploadAuthorization = {
  id: string;
  key: string;
  uploadUrl: string;
  headers: { 'Content-Type': string };
  token: string;
  expiresAt: string;
};

export type DirectUploadReference = {
  key: string;
  token: string;
};

export type VerifiedDirectUpload = {
  key: string;
  url: string;
  contentType: string;
  sizeBytes: number;
};

type UploadClaim = {
  purpose: 'public-media-upload';
  key: string;
  kind: DirectUploadKind;
  contentType: string;
  size: number;
};

const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
const MAX_PDF_BYTES = 10 * 1024 * 1024;
const AUTHORIZATION_SECONDS = 15 * 60;

export class DirectUploadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DirectUploadError';
  }
}

function signingSecret() {
  if (!env.JWT_SECRET) throw new DirectUploadError('O serviço de envio não está configurado corretamente. Tente novamente mais tarde.');
  return env.JWT_SECRET;
}

function isImage(kind: DirectUploadKind) {
  return kind !== 'PRESENTATION_PDF';
}

function extension(contentType: string) {
  if (contentType === 'image/jpeg') return 'jpg';
  if (contentType === 'image/png') return 'png';
  if (contentType === 'image/webp') return 'webp';
  return 'pdf';
}

function assertRequestIsAllowed(request: DirectUploadRequest) {
  if (!request.id || request.id.length > 80) throw new DirectUploadError('Arquivo de envio inválido.');
  if (!Number.isInteger(request.size) || request.size <= 0) throw new DirectUploadError('O arquivo selecionado é inválido.');
  if (isImage(request.kind)) {
    if (!IMAGE_TYPES.has(request.contentType)) throw new DirectUploadError('Imagens devem ser PNG, JPG ou WEBP.');
    if (request.size > MAX_IMAGE_BYTES) throw new DirectUploadError('Cada imagem deve ter no máximo 2 MB.');
    return;
  }
  if (request.contentType !== 'application/pdf') throw new DirectUploadError('A apresentação deve ser um PDF.');
  if (request.size > MAX_PDF_BYTES) throw new DirectUploadError('O PDF deve ter no máximo 10 MB.');
}

function publicUrlFor(key: string) {
  const r2 = getR2StorageConfig();
  return `${r2.publicUrl}/${key.split('/').map(encodeURIComponent).join('/')}`;
}

export class DirectUploadService {
  async authorize(requests: DirectUploadRequest[]): Promise<DirectUploadAuthorization[]> {
    if (!Array.isArray(requests) || requests.length === 0 || requests.length > 22) {
      throw new DirectUploadError('Selecione entre um e vinte e dois arquivos para o envio.');
    }
    const seenIds = new Set<string>();
    let totalSize = 0;
    for (const request of requests) {
      assertRequestIsAllowed(request);
      if (seenIds.has(request.id)) throw new DirectUploadError('Há arquivos duplicados no envio.');
      seenIds.add(request.id);
      totalSize += request.size;
    }
    if (totalSize > 20 * 1024 * 1024) throw new DirectUploadError('O total de arquivos deve ter no máximo 20 MB.');

    const r2 = getR2StorageConfig();
    const expiresAt = new Date(Date.now() + AUTHORIZATION_SECONDS * 1000);
    return Promise.all(requests.map(async (request) => {
      const key = `public-submissions/${crypto.randomUUID()}/${request.kind.toLowerCase()}.${extension(request.contentType)}`;
      const command = new PutObjectCommand({
        Bucket: r2.bucket,
        Key: key,
        ContentType: request.contentType,
      });
      const uploadUrl = await getSignedUrl(r2.client, command, { expiresIn: AUTHORIZATION_SECONDS });
      const claim: UploadClaim = {
        purpose: 'public-media-upload',
        key,
        kind: request.kind,
        contentType: request.contentType,
        size: request.size,
      };
      const token = jwt.sign(claim, signingSecret(), { expiresIn: AUTHORIZATION_SECONDS });
      return {
        id: request.id,
        key,
        uploadUrl,
        headers: { 'Content-Type': request.contentType },
        token,
        expiresAt: expiresAt.toISOString(),
      };
    }));
  }

  async verify(reference: DirectUploadReference, expectedKind: DirectUploadKind): Promise<VerifiedDirectUpload> {
    if (!reference || typeof reference.key !== 'string' || typeof reference.token !== 'string') {
      throw new DirectUploadError('Referência de arquivo inválida.');
    }

    let claim: UploadClaim;
    try {
      claim = jwt.verify(reference.token, signingSecret()) as UploadClaim;
    } catch {
      throw new DirectUploadError('A autorização do arquivo expirou. Selecione os arquivos e envie novamente.');
    }
    if (claim.purpose !== 'public-media-upload' || claim.kind !== expectedKind || claim.key !== reference.key) {
      throw new DirectUploadError('A autorização do arquivo não corresponde a este envio.');
    }

    const r2 = getR2StorageConfig();
    let head;
    try {
      head = await r2.client.send(new HeadObjectCommand({ Bucket: r2.bucket, Key: claim.key }));
    } catch {
      throw new DirectUploadError('O arquivo não foi encontrado no armazenamento. Tente enviá-lo novamente.');
    }
    if (head.ContentLength !== claim.size || head.ContentType !== claim.contentType) {
      throw new DirectUploadError('O arquivo enviado não corresponde à autorização concedida.');
    }

    let bytes: Uint8Array;
    try {
      const object = await r2.client.send(new GetObjectCommand({ Bucket: r2.bucket, Key: claim.key }));
      bytes = await object.Body!.transformToByteArray();
    } catch {
      throw new DirectUploadError('Não foi possível validar o arquivo enviado.');
    }
    const file: UploadableMedia = {
      type: claim.contentType,
      size: bytes.byteLength,
      // Cria uma cópia para garantir um ArrayBuffer comum, não um SharedArrayBuffer.
      arrayBuffer: async () => Uint8Array.from(bytes).buffer as ArrayBuffer,
    };
    if (isImage(expectedKind)) await assertImageSignature(file);
    else await assertPdfSignature(file);

    console.info('[PublicUpload] verified direct upload', { kind: expectedKind, sizeBytes: claim.size });

    return {
      key: claim.key,
      url: publicUrlFor(claim.key),
      contentType: claim.contentType,
      sizeBytes: claim.size,
    };
  }
}
