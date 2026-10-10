import { createHmac, randomUUID } from "node:crypto";
import { DeleteObjectsCommand, ListObjectsV2Command, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

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

  // The path carries a keyed hash of the owner, never the user id: listing
  // or guessing paths reveals nothing, yet a post can prove an image is the
  // poster's own (see ownUploadMimeType).
  const key = `posts/${ownerTag(ownerId)}/${randomUUID()}.${allowedTypes[detected].ext}`;

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

/** Keyed, one-way: the same member always gets the same tag; nobody can reverse it. */
export function ownerTag(userId: string) {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is required to sign uploads.");
  return createHmac("sha256", secret).update(`upload:${userId}`).digest("hex").slice(0, 20);
}

const extensionTypes: Record<string, string> = { png: "image/png", jpg: "image/jpeg", webp: "image/webp" };

/**
 * The MIME type of an image this member uploaded, or null for any other URL
 * — someone else's upload, an external tracking pixel, anything. The type
 * comes from our own key, never from the client.
 */
export function ownUploadMimeType(url: string, userId: string) {
  const publicBase = (process.env.S3_PUBLIC_URL ?? process.env.S3_ENDPOINT ?? "").replace(/\/$/, "");
  const prefix = `${publicBase}/${process.env.S3_BUCKET}/posts/${ownerTag(userId)}/`;
  if (!url.startsWith(prefix)) return null;
  const match = url.slice(prefix.length).match(/^[0-9a-f-]{36}\.(png|jpg|webp)$/);
  return match ? extensionTypes[match[1]] : null;
}

/**
 * Removes every image a member uploaded, for account deletion. Covers both
 * key layouts: the owner-hash prefix and the older user-id prefix.
 */
export async function deleteUserUploads(userId: string) {
  const client = getClient();
  const bucket = process.env.S3_BUCKET;
  let removed = 0;
  for (const prefix of [`posts/${ownerTag(userId)}/`, `posts/${userId}/`]) {
    const listed = await client.send(new ListObjectsV2Command({ Bucket: bucket, Prefix: prefix }));
    const keys = (listed.Contents ?? []).map((object) => ({ Key: object.Key! }));
    if (keys.length === 0) continue;
    await client.send(new DeleteObjectsCommand({ Bucket: bucket, Delete: { Objects: keys } }));
    removed += keys.length;
  }
  return removed;
}
