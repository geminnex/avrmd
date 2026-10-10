// Mirrors the media bucket into a local directory, downloading only objects
// not already there. Used by scripts/backup.sh.
import { mkdir, stat, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { GetObjectCommand, ListObjectsV2Command, S3Client } from "@aws-sdk/client-s3";

const target = resolve(process.argv[2] ?? "media-backup");
const bucket = process.env.S3_BUCKET;
const client = new S3Client({
  endpoint: process.env.S3_ENDPOINT,
  region: "us-east-1",
  forcePathStyle: true,
  credentials: { accessKeyId: process.env.S3_ACCESS_KEY, secretAccessKey: process.env.S3_SECRET_KEY },
});

let token;
let fetched = 0;
let total = 0;
do {
  const page = await client.send(new ListObjectsV2Command({ Bucket: bucket, ContinuationToken: token }));
  for (const object of page.Contents ?? []) {
    total += 1;
    const path = join(target, object.Key);
    if (!path.startsWith(target)) continue; // never write outside the target
    const existing = await stat(path).catch(() => null);
    if (existing && existing.size === object.Size) continue;
    const body = await (await client.send(new GetObjectCommand({ Bucket: bucket, Key: object.Key }))).Body.transformToByteArray();
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, body);
    fetched += 1;
  }
  token = page.IsTruncated ? page.NextContinuationToken : undefined;
} while (token);
console.log(`media: ${total} objects, ${fetched} downloaded`);
