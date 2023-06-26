import {
  DeleteObjectCommand,
  GetObjectCommand,
  ListBucketsCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import type { S3Object, S3ObjectInternal } from '@stellariscloud/types'
import { singleton } from 'tsyringe'

export const transformFolderObjectToInternal = (
  obj: S3Object,
): S3ObjectInternal => {
  return {
    key: obj.Key ?? '',
    size: obj.Size ?? 0,
    eTag: obj.ETag ?? '',
    owner: obj.Owner
      ? {
          displayName: obj.Owner.DisplayName ?? '',
          id: obj.Owner.ID ?? '',
        }
      : { displayName: '', id: '' },
    checksumAlgorithm: obj.ChecksumAlgorithm ?? [],
    storageClass: obj.StorageClass ?? '',
    lastModified: obj.LastModified?.getTime() ?? 0,
  }
}

export interface S3PutObjectOptions {
  bucket: string
  key: string
  data: Buffer
  contentType: string
}

export interface S3GetObjectOptions {
  bucket: string
  key: string
}

export interface S3ListObjectsOptions {
  bucket: string
  startAfterKey?: string
  prefix?: string
}

export interface S3DeleteObjectOptions {
  bucket: string
  key: string
}

export interface S3MoveObjectOptions {
  sourceBucket: string
  sourceKey: string
  destinationBucket: string
  destinationKey: string
}

export const configureS3Client = ({
  accessKeyId,
  secretAccessKey,
  endpoint,
  region,
}: {
  accessKeyId: string
  secretAccessKey: string
  endpoint: string
  region?: string
}) => {
  return new S3Client({
    credentials: { accessKeyId, secretAccessKey },
    endpoint,
    region: region ?? 'auto',
    forcePathStyle: true,
  })
}

@singleton()
export class S3Service {
  async s3ListBucketObjects({
    continuationToken,
    s3Client,
    bucketName,
    prefix,
  }: {
    prefix?: string
    continuationToken?: string
    s3Client: S3Client
    bucketName: string
  }) {
    const bucketObjectsResponse = await s3Client
      .send(
        new ListObjectsV2Command({
          Prefix: prefix,
          Bucket: bucketName,
          ...(continuationToken && continuationToken.length > 0
            ? {
                ContinuationToken: continuationToken,
              }
            : {}),
        }),
      )
      .catch((e) => {
        console.log('bucket list error', e)
        throw e
      })

    return {
      result:
        bucketObjectsResponse.Contents?.map((r) =>
          transformFolderObjectToInternal(r),
        ) ?? [],
      continuationToken: bucketObjectsResponse.NextContinuationToken,
    }
  }

  async s3HeadObject({
    s3Client,
    bucketName,
    objectKey,
    eTag,
    retries = 3,
  }: {
    s3Client: S3Client
    bucketName: string
    objectKey: string
    eTag?: string
    retries?: number
  }) {
    let obj
    let attempts = 0
    while (!obj && attempts < retries) {
      if (attempts > 0) {
        const timeout = attempts * 500
        await new Promise((resolve) => setTimeout(resolve, timeout))
      }
      attempts += 1
      const objects = await this.s3ListBucketObjects({
        s3Client,
        bucketName,
        prefix: objectKey,
      })
      obj = objects.result.find((o) => {
        if (eTag && eTag !== o.eTag) {
          return false
        }
        return o.key === objectKey
      })
    }
    if (!obj) {
      throw new Error(`Object not found by key: ${objectKey}.`)
    }
    return obj
  }

  async s3ListBuckets({ s3Client }: { s3Client: S3Client }) {
    const buckets = await s3Client.send(new ListBucketsCommand({}))
    return buckets
  }

  async s3DeleteBucketObject({
    s3Client,
    bucket: bucketName,
    objectKey,
  }: {
    s3Client: S3Client
    bucket: string
    objectKey: string
  }) {
    const url = await getSignedUrl(
      s3Client,
      new DeleteObjectCommand({
        Bucket: bucketName,
        Key: objectKey,
      }),
      { expiresIn: 1200 },
    )

    const deleteObjectResponse = await fetch(url, { method: 'DELETE' }).catch(
      (e) => {
        console.log('Error deleting object:', e)
        throw e
      },
    )
    return deleteObjectResponse
  }

  async s3GetPresignedURLs(
    s3Client: S3Client,
    bucketName: string,
    objectKeys: { objectKey: string; method: 'PUT' | 'DELETE' | 'GET' }[],
  ) {
    return Promise.all(
      objectKeys.map(async ({ objectKey, method }) => {
        let command: GetObjectCommand | PutObjectCommand | DeleteObjectCommand
        if (method === 'DELETE') {
          command = new DeleteObjectCommand({
            Bucket: bucketName,
            Key: objectKey,
          })
        } else if (method === 'PUT') {
          command = new PutObjectCommand({
            Bucket: bucketName,
            Key: objectKey,
          })
        } else {
          command = new GetObjectCommand({
            Bucket: bucketName,
            Key: objectKey,
          })
        }

        const url = await getSignedUrl(s3Client, command, { expiresIn: 1200 })
        return { objectKey, url, method }
      }),
    )
  }

  async testS3Connection(input: {
    name: string
    accessKeyId: string
    secretAccessKey: string
    endpoint: string
    region?: string
  }) {
    let success
    try {
      const s3Client = configureS3Client({
        ...input,
        region: input.region ?? 'auto',
      })
      await this.s3ListBuckets({ s3Client })
      success = true
    } catch (e) {
      success = false
    }

    return success
  }
}
