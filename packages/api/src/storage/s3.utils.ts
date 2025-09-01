import type { SignedURLsRequestMethod } from '@lombokapp/types'
import { encodeS3ObjectKey } from '@lombokapp/utils'
import aws4 from 'aws4'

export function createS3PresignedUrls(
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
      'X-Amz-Expires': String(request.expirySeconds),
      'X-Amz-Content-Sha256': 'UNSIGNED-PAYLOAD',
    }
    const queryString = new URLSearchParams(urlParams).toString()

    const signedRequest = aws4.sign(
      {
        service: 's3',
        region: request.region,
        method: request.method,
        path: `/${request.bucket}/${encodeS3ObjectKey(request.objectKey)}?${queryString}`,
        host: hostnames[request.endpoint],
        signQuery: true,
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
