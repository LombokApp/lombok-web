import {
  ListBucketsCommand,
  ListObjectsV2Command,
  S3Client,
} from '@aws-sdk/client-s3'
import type { S3Object, S3ObjectInternal } from '@lombokapp/types'
import { SignedURLsRequestMethod } from '@lombokapp/types'
import { encodeS3ObjectKey } from '@lombokapp/utils'
import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common'
import aws4 from 'aws4'

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
    s3Client,
    bucketName,
    prefix,
    continuationToken,
  }: {
    s3Client: S3Client
    bucketName: string
    prefix?: string
    continuationToken?: string
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
        // eslint-disable-next-line no-console
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
    const [url] = this.createS3PresignedUrls([
      {
        endpoint,
        region,
        accessKeyId,
        secretAccessKey,
        bucket,
        objectKey: encodeS3ObjectKey(objectKey),
        method: SignedURLsRequestMethod.HEAD,
        expirySeconds: 300,
      },
    ])

    const headObjectResponse = await fetch(url, { method: 'HEAD' }).catch(
      (e) => {
        // eslint-disable-next-line no-console
        console.log('Error getting object:', e)
        throw e
      },
    )

    if (headObjectResponse.status === 404) {
      throw new NotFoundException(`Object not found by key: ${objectKey}.`)
    }

    if (headObjectResponse.status === 403) {
      throw new UnauthorizedException(
        `Access denied to object by key: ${objectKey}.`,
      )
    }

    if (headObjectResponse.status !== 200) {
      throw new InternalServerErrorException(
        `Error (${headObjectResponse.status}) getting HEAD for object key "${objectKey}".`,
      )
    }

    const lastModified = headObjectResponse.headers.get('last-modified')
    const lastModifiedDate = lastModified
      ? new Date(lastModified).getMilliseconds()
      : undefined
    const sizeStr =
      headObjectResponse.headers.get('content-length') ?? undefined
    return {
      mimeType: headObjectResponse.headers.get('content-type') ?? undefined,
      eTag: headObjectResponse.headers.get('etag') ?? undefined,
      lastModified: lastModifiedDate,
      size: sizeStr ? parseInt(sizeStr, 10) : undefined,
    }
  }

  async s3GetBucketObject({
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
        method: SignedURLsRequestMethod.GET,
        expirySeconds: 3600,
      },
    ])[0]

    const getObjectResponse = await fetch(url).catch((e) => {
      // eslint-disable-next-line no-console
      console.log('Error getting object:', e)
      throw e
    })
    return getObjectResponse
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

    const deleteObjectResponse = await fetch(url, { method: 'DELETE' }).catch(
      (e) => {
        // eslint-disable-next-line no-console
        console.log('Error deleting object:', e)
        throw e
      },
    )
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
    const hostnames = requests.reduce<Record<string, string>>(
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

  async deleteAllWithPrefix({
    accessKeyId,
    secretAccessKey,
    endpoint,
    bucket,
    prefix,
    region,
  }: {
    endpoint: string
    region: string
    accessKeyId: string
    secretAccessKey: string
    bucket: string
    prefix: string
  }) {
    const s3Client = configureS3Client({
      accessKeyId,
      secretAccessKey,
      endpoint,
      region,
    })

    let continuationToken: string | undefined = ''
    let count = 0

    while (continuationToken) {
      const response = await this.s3ListBucketObjects({
        s3Client,
        bucketName: bucket,
        prefix,
        continuationToken,
      })

      for (const objectKey of response.result) {
        await this.s3DeleteBucketObject({
          accessKeyId,
          secretAccessKey,
          endpoint,
          region,
          bucket,
          objectKey: objectKey.key,
        })
      }

      count += response.result.length
      continuationToken = response.continuationToken
    }
    return { count }
  }

  async testS3Connection(input: {
    name: string
    accessKeyId: string
    secretAccessKey: string
    endpoint: string
    region?: string
  }) {
    let success: boolean
    try {
      const s3Client = configureS3Client({
        ...input,
        region: input.region ?? 'auto',
      })
      await this.s3ListBuckets({ s3Client })
      success = true
    } catch {
      success = false
    }

    return success
  }
}
