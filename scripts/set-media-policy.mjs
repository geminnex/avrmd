// Sets the media bucket so anyone can fetch an object by its exact URL, and
// nobody anonymous can list the bucket. Idempotent.
//
//   set -a; . ./.env; set +a; node scripts/set-media-policy.mjs
import { PutBucketPolicyCommand, S3Client } from "@aws-sdk/client-s3";

const bucket = process.env.S3_BUCKET;
const client = new S3Client({
  endpoint: process.env.S3_ENDPOINT,
  region: "us-east-1",
  forcePathStyle: true,
  credentials: { accessKeyId: process.env.S3_ACCESS_KEY, secretAccessKey: process.env.S3_SECRET_KEY },
});

const policy = {
  Version: "2012-10-17",
  Statement: [
    {
      Effect: "Allow",
      Principal: { AWS: ["*"] },
      Action: ["s3:GetObject"],
      Resource: [`arn:aws:s3:::${bucket}/*`],
    },
  ],
};

await client.send(new PutBucketPolicyCommand({ Bucket: bucket, Policy: JSON.stringify(policy) }));
console.log(`${bucket}: anonymous GetObject only; listing closed.`);
