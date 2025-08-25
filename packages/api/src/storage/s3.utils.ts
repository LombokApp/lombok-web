import type { SignedURLsRequestMethod } from '@lombokapp/types'
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
