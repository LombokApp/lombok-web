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
  {
    retryPeriodMs,
    maxRetries,
    totalMaxDurationMs,
  }: { retryPeriodMs: number; maxRetries: number; totalMaxDurationMs: number },
  onTimeout?: (error: WaitForTrueError) => void,
): Promise<void> {
  if (!Number.isFinite(retryPeriodMs) || retryPeriodMs < 0) {
    throw new Error(
      `retryPeriodMs must be a non-negative finite number; got ${retryPeriodMs}`,
    )
  }
  if (!Number.isFinite(maxRetries) || maxRetries < 0) {
    throw new Error(
      `maxRetries must be a non-negative finite number; got ${maxRetries}`,
    )
  }
  if (!Number.isFinite(totalMaxDurationMs) || totalMaxDurationMs < 0) {
    throw new Error(
      `totalMaxDurationMs must be a non-negative finite number; got ${totalMaxDurationMs}`,
    )
  }

  // Semantics: maxRetries means "retries after the first attempt".
  // So total attempts allowed = 1 + maxRetries.
  const maxAttempts = maxRetries + 1

  let done = false
  let retryTimer: NodeJS.Timeout | undefined
  let totalTimer: NodeJS.Timeout | undefined

  // Helper to read done - breaks TypeScript's control flow analysis
  const getDone = () => done

  const cleanup = () => {
    done = true
    if (retryTimer) {
      clearTimeout(retryTimer)
      retryTimer = undefined
    }
    if (totalTimer) {
      clearTimeout(totalTimer)
      totalTimer = undefined
    }
  }

  const asError = (e: unknown): Error =>
    e instanceof Error ? e : new Error(String(e))

  const conditionPromise = new Promise<void>((resolve, reject) => {
    let attempts = 0

    const finishResolve = () => {
      if (getDone()) {
        return
      }
      cleanup()
      resolve()
    }

    const finishReject = (err: Error) => {
      if (getDone()) {
        return
      }
      cleanup()
      reject(err)
    }

    async function checkOnce() {
      if (getDone()) {
        return
      }

      attempts += 1

      let result: boolean
      try {
        // Promise assimilation handles sync/async/thenables without instanceof checks
        result = await Promise.resolve(condition())
      } catch (e) {
        finishReject(asError(e))
        return
      }

      // Check done after await - it may have changed during the async operation
      if (getDone()) {
        return
      }

      if (result) {
        finishResolve()
        return
      }

      if (attempts >= maxAttempts) {
        finishReject(
          new WaitForTrueError(
            'TIMEOUT',
            `Timeout waiting for condition to return true after ${attempts} attempt(s).`,
          ),
        )
        return
      }

      // Schedule next check
      if (!getDone()) {
        retryTimer = setTimeout(() => {
          void checkOnce()
        }, retryPeriodMs)
      }
    }

    // First attempt is immediate (no initial delay).
    void checkOnce()
  })

  const timeoutPromise = new Promise<void>((_resolve, reject) => {
    totalTimer = setTimeout(() => {
      if (getDone()) {
        return
      }
      cleanup()
      reject(
        new WaitForTrueError(
          'TIMEOUT',
          `Timeout waiting for condition to return true after ${totalMaxDurationMs}ms.`,
        ),
      )
    }, totalMaxDurationMs)
  })

  try {
    await Promise.race([conditionPromise, timeoutPromise]).catch((err) => {
      if (err instanceof WaitForTrueError && err.code === 'TIMEOUT') {
        onTimeout?.(err)
      }
      throw err
    })
  } finally {
    // Ensures we always tear down timers even if caller cancels/throws mid-await.
    cleanup()
  }
}
