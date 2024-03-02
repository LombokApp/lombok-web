import {
  ListBucketsCommand,
  ListObjectsV2Command,
  S3Client,
} from '@aws-sdk/client-s3'
import { Injectable } from '@nestjs/common'
import type { S3Object, S3ObjectInternal } from '@stellariscloud/types'
import { SignedURLsRequestMethod } from '@stellariscloud/types'
import aws4 from 'aws4'
import axios from 'axios'

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

@Injectable()
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
    let obj: S3ObjectInternal | undefined
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
    accessKeyId,
    secretAccessKey,
    region = 'auto',
    bucket,
    endpoint,
    objectKey,
  }: {
    accessKeyId: string
    secretAccessKey: string
    region?: string
    endpoint: string
    bucket: string
    objectKey: string
  }) {
    const url = this.createS3PresignedUrls([
      {
        accessKeyId,
        secretAccessKey,
        region,
        endpoint,
        bucket,
        objectKey,
        method: SignedURLsRequestMethod.DELETE,
        expirySeconds: 3600,
      },
    ])[0]

    const deleteObjectResponse = await axios.delete(url).catch((e) => {
      console.log('Error deleting object:', e)
      throw e
    })
    return deleteObjectResponse
  }

  createS3PresignedUrls(
    requests: {
      endpoint: string
      region: string
      accessKeyId: string
      secretAccessKey: string
      bucket: string
      objectKey: string
      method: SignedURLsRequestMethod
      expirySeconds: number
    }[],
  ) {
    const hostnames = requests.reduce<{ [key: string]: string }>(
      (acc, next) =>
        next.endpoint in acc
          ? acc
          : {
              ...acc,
              [next.endpoint]: new URL(next.endpoint).host,
            },
      {},
    )

    const urls = requests.map((request) => {
      const urlParams = {
        'X-Amz-Expires': request.expirySeconds,
        'x-id': `${request.method[0].toUpperCase()}${request.method
          .slice(1)
          .toLowerCase()}Object`,
        'X-Amz-Content-Sha256': 'UNSIGNED-PAYLOAD',
      }
      const queryString = Object.keys(urlParams)
        .map(
          (key) =>
            `${key}=${encodeURIComponent(
              urlParams[key as keyof typeof urlParams],
            )}`,
        )
        .join('&')

      const signedRequest = aws4.sign(
        {
          service: 's3',
          region: request.region,
          method: request.method,
          path: `/${request.bucket}/${request.objectKey}?${new URLSearchParams(
            queryString,
          )}`,
          host: hostnames[request.endpoint],
          signQuery: true,
          body: JSON.stringify(urlParams),
        },
        {
          accessKeyId: request.accessKeyId,
          secretAccessKey: request.secretAccessKey,
        },
      )
      return `${request.endpoint}${signedRequest.path}`
    })
    return urls
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
