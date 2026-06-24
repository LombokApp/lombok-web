export function isOk<
  R extends { data?: unknown; error?: unknown; response: Response },
>(
  apiResponse: R,
): apiResponse is R & { data: NonNullable<R['data']>; error?: never } {
  return (
    typeof apiResponse.data !== 'undefined' &&
    typeof apiResponse.error === 'undefined'
  )
}

export function deterministicJobId(taskId: string, attemptCount: number) {
  return Bun.randomUUIDv5(`${attemptCount}`, taskId)
}

export function getAppRequestWorkerHostname(params: {
  platformHost: string
  appIdentifier: string
  workerIdentifier: string
}): string {
  const { platformHost, appIdentifier, workerIdentifier } = params
  return `api-server--${workerIdentifier}--${appIdentifier}.${platformHost}`
}
