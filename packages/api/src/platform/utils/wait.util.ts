export class WaitForTrueError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message)
    this.name = 'WaitForTrueError'
  }
}

export async function waitForTrue(
  condition: (() => boolean) | (() => Promise<boolean>),
  { retryPeriod, maxRetries }: { retryPeriod: number; maxRetries: number },
) {
  await new Promise<void>((resolve, reject) => {
    let checkCount = 0
    let timeout: NodeJS.Timeout | undefined = undefined
    const checkerFunc = () => {
      const conditionResult = condition()
      void (
        conditionResult instanceof Promise
          ? conditionResult
          : Promise.resolve(conditionResult)
      ).then((result) => {
        if (result) {
          clearTimeout(timeout)
          resolve()
        } else if (checkCount >= maxRetries) {
          clearTimeout(timeout)
          reject(
            new WaitForTrueError(
              'TIMEOUT',
              'Timeout waiting for condition to return true.',
            ),
          )
        } else {
          timeout = setTimeout(checkerFunc, retryPeriod)
        }
      })
      checkCount += 1
    }
    timeout = setTimeout(checkerFunc, retryPeriod)
  })
}
