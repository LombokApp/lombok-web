// Empty the dev system buckets over S3 (Garage storage is opaque — can't rm
// files). Used by `./dx purge garage:truncate`. Deletes every object but keeps
// the buckets. Reads the auto-generated embedded key from the persisted file
// (entrypoint-exported EMBEDDED_S3_* env is not visible to `docker compose exec`).
import {
  DeleteObjectCommand,
  ListObjectsV2Command,
  type ListObjectsV2CommandOutput,
  S3Client,
} from '@aws-sdk/client-s3'
import { readFileSync } from 'fs'

function readEmbeddedKey(): { accessKeyId: string; secretAccessKey: string } {
  let accessKeyId = process.env.EMBEDDED_S3_ACCESS_KEY_ID ?? ''
  let secretAccessKey = process.env.EMBEDDED_S3_SECRET_ACCESS_KEY ?? ''
  if (!accessKeyId || !secretAccessKey) {
    try {
      const file = readFileSync('/var/lib/garage/.lombok-builtin-key', 'utf8')
      for (const line of file.split('\n')) {
        const [k, v] = line.split('=')
        if (k === 'EMBEDDED_S3_ACCESS_KEY_ID') {
          accessKeyId = v?.trim() ?? ''
        } else if (k === 'EMBEDDED_S3_SECRET_ACCESS_KEY') {
          secretAccessKey = v?.trim() ?? ''
        }
      }
    } catch {
      // fall through to the error below
    }
  }
  if (!accessKeyId || !secretAccessKey) {
    throw new Error('Could not resolve the embedded Garage credentials.')
  }
  return { accessKeyId, secretAccessKey }
}

const { accessKeyId, secretAccessKey } = readEmbeddedKey()
const region = process.env.EMBEDDED_S3_REGION ?? 'auto'
const endpoint = 'http://127.0.0.1:9000'

// System buckets (coreConfig defaults) + the dev External-provision demo bucket.
const buckets = ['server-storage', 'provisions', 'uploads', 'external-demo']

const s3Client: S3Client = new S3Client({
  credentials: { accessKeyId, secretAccessKey },
  endpoint,
  region,
  forcePathStyle: true,
})

for (const bucket of buckets) {
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
}
