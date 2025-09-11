import type { FetchResponse } from 'openapi-fetch'

export function isOk<
  T extends Record<string | number, unknown>,
  Options,
  Media extends `${string}/${string}`,
>(
  apiResponse: FetchResponse<T, Options, Media>,
): apiResponse is {
  data: NonNullable<FetchResponse<T, Options, Media>['data']>
  error?: never
  response: Response
} {
  return (
    typeof apiResponse.data !== 'undefined' &&
    typeof apiResponse.error === 'undefined'
  )
}
