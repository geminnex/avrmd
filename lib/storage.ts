import { randomUUID } from "node:crypto";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

/**
 * Uploads relay through this server rather than a presigned direct-to-browser
 * PUT: it's the simpler way to get real validation right — actual byte size,
 * actual file signature — instead of trusting a client-supplied Content-Type
 * inside an S3 POST policy.
 */
const maxUploadBytes = 5 * 1024 * 1024; // 5MB

const allowedTypes = {
  "image/png": { ext: "png", signature: [0x89, 0x50, 0x4e, 0x47] },
  "image/jpeg": { ext: "jpg", signature: [0xff, 0xd8, 0xff] },
  "image/webp": { ext: "webp", signature: [0x52, 0x49, 0x46, 0x46] }, // "RIFF"; WEBP checked separately
} as const;

export type AllowedMimeType = keyof typeof allowedTypes;

let client: S3Client | undefined;

function getClient() {
  client ??= new S3Client({
    region: "us-east-1",
    endpoint: process.env.S3_ENDPOINT,
    forcePathStyle: true, // required for MinIO
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY ?? "",
      secretAccessKey: process.env.S3_SECRET_KEY ?? "",
    },
  });
  return client;
}

function detectImageType(bytes: Uint8Array): AllowedMimeType | undefined {
  for (const [mime, { signature }] of Object.entries(allowedTypes) as [
    AllowedMimeType,
    (typeof allowedTypes)[AllowedMimeType],
  ][]) {
    if (signature.every((byte, index) => bytes[index] === byte)) {
      if (mime === "image/webp" && !isWebp(bytes)) continue;
      return mime;
    }
  }
  return undefined;
}

/** RIFF is shared with other formats (WAV, AVI); bytes 8–11 must read "WEBP". */
function isWebp(bytes: Uint8Array) {
  return (
    bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
  );
}

export type UploadResult =
  | { ok: true; url: string; mimeType: AllowedMimeType }
  | { ok: false; error: string };

/**
 * Validates size and the actual file signature (not the client-reported
 * Content-Type — a renamed .html can claim to be image/png) before ever
 * writing to storage. No SVG anywhere in the allowlist: it's an XSS vector
 * when served back and rendered.
 */
export async function uploadPostImage(
  buffer: Buffer,
  ownerId: string,
): Promise<UploadResult> {
  if (buffer.byteLength === 0) return { ok: false, error: "Empty file." };
  if (buffer.byteLength > maxUploadBytes) {
    return { ok: false, error: "Images must be under 5MB." };
  }

  const detected = detectImageType(buffer);
  if (!detected) {
    return { ok: false, error: "Only PNG, JPEG, and WEBP images are accepted." };
  }

  const key = `posts/${ownerId}/${randomUUID()}.${allowedTypes[detected].ext}`;

  await getClient().send(
    new PutObjectCommand({
      Bucket: process.env.S3_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: detected,
    }),
  );

  // S3_ENDPOINT (127.0.0.1:9000) is where the server writes to — never
  // reachable from a browser. S3_PUBLIC_URL is the Caddy-proxied path a
  // visitor can actually load; the two must stay distinct, the same lesson
  // learned the hard way from AUTH_URL vs the request's internal origin.
  const publicBase = (process.env.S3_PUBLIC_URL ?? process.env.S3_ENDPOINT ?? "").replace(
    /\/$/,
    "",
  );
  return { ok: true, url: `${publicBase}/${process.env.S3_BUCKET}/${key}`, mimeType: detected };
}
