import type { UploadableMedia } from './media.storage';

export class MediaValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MediaValidationError';
  }
}

export async function assertImageSignature(file: UploadableMedia) {
  const bytes = Buffer.from(await file.arrayBuffer());
  const isJpeg = bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const isPng = bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  const isWebp = bytes.length >= 12 && bytes.subarray(0, 4).toString('ascii') === 'RIFF' && bytes.subarray(8, 12).toString('ascii') === 'WEBP';
  const valid = (file.type === 'image/jpeg' && isJpeg)
    || (file.type === 'image/png' && isPng)
    || (file.type === 'image/webp' && isWebp);
  if (!valid) throw new MediaValidationError('O conteúdo da imagem não corresponde ao formato informado.');
}

export async function assertPdfSignature(file: UploadableMedia) {
  const bytes = Buffer.from(await file.arrayBuffer());
  if (file.type !== 'application/pdf' || bytes.subarray(0, 5).toString('ascii') !== '%PDF-') {
    throw new MediaValidationError('O conteúdo enviado não é um PDF válido.');
  }
}
