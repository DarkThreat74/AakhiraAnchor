import 'server-only';
import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { env } from '@/lib/env';

/**
 * Cloudflare R2 client (S3-compatible API).
 * Used for storing self-hosted MP3 talks.
 */

const R2_ENDPOINT = `https://${env.r2AccountId}.r2.cloudflarestorage.com`;

const s3 = new S3Client({
  region: 'auto',
  endpoint: R2_ENDPOINT,
  credentials: {
    accessKeyId: env.r2AccessKeyId,
    secretAccessKey: env.r2SecretAccessKey,
  },
});

const BUCKET = env.r2BucketName;

/**
 * Generate a presigned PUT URL for uploading an MP3 to R2.
 * The client uploads directly to R2 — no server-side file handling.
 * URL expires in 15 minutes.
 */
export async function getUploadUrl(storageKey: string, contentType: string = 'audio/mpeg'): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: storageKey,
    ContentType: contentType,
  });
  return getSignedUrl(s3, command, { expiresIn: 900 });
}

/**
 * Generate a presigned GET URL for streaming an MP3 from R2.
 * URL expires in 1 hour (enough for a long talk).
 */
export async function getStreamUrl(storageKey: string): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: BUCKET,
    Key: storageKey,
  });
  return getSignedUrl(s3, command, { expiresIn: 3600 });
}

/**
 * Delete an object from R2 (used when deleting a talk).
 */
export async function deleteObject(storageKey: string): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: BUCKET,
    Key: storageKey,
  });
  await s3.send(command);
}

/**
 * Generate a stable storage key for a talk.
 * Format: talks/{folderName}/{timestamp}-{filename}
 */
export function makeStorageKey(folderName: string, filename: string): string {
  const safeFolder = folderName.replace(/[^a-z0-9-]/gi, '-').toLowerCase() || 'uncategorized';
  const safeName = filename.replace(/[^a-z0-9.-]/gi, '-').toLowerCase();
  const ts = Date.now();
  return `talks/${safeFolder}/${ts}-${safeName}`;
}
