// Empty the dev bucket over S3 (Garage storage is opaque — can't rm files).
// Used by `./dx purge garage:truncate`. Deletes every object but keeps the bucket.
import {
  DeleteObjectCommand,
  ListObjectsV2Command,
  type ListObjectsV2CommandOutput,
  S3Client,
} from '@aws-sdk/client-s3'

const accessKeyId = process.env.DEV_S3_ACCESS_KEY_ID ?? ''
const secretAccessKey = process.env.DEV_S3_SECRET_ACCESS_KEY ?? ''
const bucket = process.env.DEV_S3_BUCKET_NAME ?? ''
const endpoint = process.env.DEV_S3_ENDPOINT ?? 'http://127.0.0.1:9000'
const region = process.env.DEV_S3_REGION ?? 'auto'

if (!accessKeyId || !secretAccessKey || !bucket) {
  throw new Error(
    'DEV_S3_ACCESS_KEY_ID, DEV_S3_SECRET_ACCESS_KEY and DEV_S3_BUCKET_NAME are required',
  )
}

const s3Client: S3Client = new S3Client({
  credentials: { accessKeyId, secretAccessKey },
  endpoint,
  region,
  forcePathStyle: true,
})

let continuationToken: string | undefined = undefined
let deleted = 0
do {
  const listed: ListObjectsV2CommandOutput = await s3Client.send(
    new ListObjectsV2Command({
      Bucket: bucket,
      ContinuationToken: continuationToken,
    }),
  )
  for (const obj of listed.Contents ?? []) {
    await s3Client.send(
      new DeleteObjectCommand({ Bucket: bucket, Key: obj.Key }),
    )
    deleted += 1
  }
  continuationToken = listed.NextContinuationToken
} while (continuationToken)

// eslint-disable-next-line no-console
console.log(`Emptied bucket "${bucket}" (${deleted} objects deleted).`)
