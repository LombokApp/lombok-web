// One-shot: apply an S3 lifecycle rule to the dedicated uploads bucket so
// abandoned staged uploads are reaped automatically. The frontend uploads icons
// (and similar) via a presigned PUT and then references them in a create/update
// request; if that follow-up never arrives, the staged object would otherwise
// linger forever. The whole bucket is ephemeral staging, so expire everything.
// Garage (v1.0+) supports lifecycle Expiration at day granularity. Run via bun
// from the provisioning script against GARAGE_S3_BUCKET (the uploads bucket).
import {
  PutBucketLifecycleConfigurationCommand,
  S3Client,
} from '@aws-sdk/client-s3'

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
  new PutBucketLifecycleConfigurationCommand({
    Bucket: bucket,
    LifecycleConfiguration: {
      Rules: [
        {
          ID: 'expire-staged-uploads',
          Status: 'Enabled',
          Filter: { Prefix: '' },
          Expiration: { Days: 1 },
          AbortIncompleteMultipartUpload: { DaysAfterInitiation: 1 },
        },
      ],
    },
  }),
)

// eslint-disable-next-line no-console
console.log(
  `Garage lifecycle applied to bucket "${bucket}" (expire all objects after 1 day).`,
)
