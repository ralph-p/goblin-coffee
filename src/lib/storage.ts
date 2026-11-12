import "server-only";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "@/lib/env";

/** S3 client. Setting S3_ENDPOINT points it at MinIO/R2 for self-hosting. */
let client: S3Client | undefined;

function s3() {
  const e = env();
  client ??= new S3Client({
    region: e.S3_REGION,
    endpoint: e.S3_ENDPOINT,
    forcePathStyle: Boolean(e.S3_ENDPOINT),
    credentials: {
      accessKeyId: e.S3_ACCESS_KEY_ID,
      secretAccessKey: e.S3_SECRET_ACCESS_KEY,
    },
  });
  return client;
}

/** Presigned PUT so the browser uploads straight to the bucket. */
export async function presignUpload(key: string, contentType: string) {
  const command = new PutObjectCommand({
    Bucket: env().S3_BUCKET,
    Key: key,
    ContentType: contentType,
  });
  return getSignedUrl(s3(), command, { expiresIn: 60 * 5 });
}

/** Public URL for a stored object (CDN/custom domain if configured). */
export function publicUrl(key: string) {
  const e = env();
  const base =
    e.S3_PUBLIC_URL ?? `https://${e.S3_BUCKET}.s3.${e.S3_REGION}.amazonaws.com`;
  return `${base.replace(/\/$/, "")}/${key}`;
}
