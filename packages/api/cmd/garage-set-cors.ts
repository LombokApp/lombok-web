// One-shot: apply permissive dev/e2e CORS to the Garage bucket so browser-direct
// presigned uploads/downloads work. Garage has no permissive default (MinIO did).
// Run via bun from the provisioning script.
import { PutBucketCorsCommand, S3Client } from '@aws-sdk/client-s3'

const accessKeyId = process.env.GARAGE_S3_ACCESS_KEY_ID ?? ''
const secretAccessKey = process.env.GARAGE_S3_SECRET_KEY ?? ''
const bucket = process.env.GARAGE_S3_BUCKET ?? ''
const endpoint = process.env.GARAGE_S3_ENDPOINT ?? 'http://127.0.0.1:9000'

if (!accessKeyId || !secretAccessKey || !bucket) {
  throw new Error(
    'GARAGE_S3_ACCESS_KEY_ID, GARAGE_S3_SECRET_KEY and GARAGE_S3_BUCKET are required',
  )
}

const s3Client = new S3Client({
  credentials: { accessKeyId, secretAccessKey },
  endpoint,
  region: 'auto',
  forcePathStyle: true,
})

await s3Client.send(
  new PutBucketCorsCommand({
    Bucket: bucket,
    CORSConfiguration: {
      CORSRules: [
        {
          AllowedOrigins: ['*'],
          AllowedMethods: ['GET', 'PUT', 'HEAD', 'DELETE'],
          AllowedHeaders: ['*'],
          ExposeHeaders: ['ETag'],
          MaxAgeSeconds: 3600,
        },
      ],
    },
  }),
)

// eslint-disable-next-line no-console
console.log(`Garage CORS applied to bucket "${bucket}".`)
