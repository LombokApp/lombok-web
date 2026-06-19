/**
 * Trailing debounce with an optional `maxWait` cap. The wrapped function fires
 * `waitMs` after the last call, but never waits longer than `maxWait` from the
 * first pending call — so a continuous stream still flushes periodically rather
 * than starving. Exposes `cancel()` and `flush()`.
 */
export interface DebouncedFunction<TArgs extends unknown[]> {
  (...args: TArgs): void
  cancel: () => void
  flush: () => void
}

export function debounce<TArgs extends unknown[]>(
  fn: (...args: TArgs) => void,
  waitMs: number,
  options: { maxWait?: number } = {},
): DebouncedFunction<TArgs> {
  let timer: ReturnType<typeof setTimeout> | undefined
  let maxTimer: ReturnType<typeof setTimeout> | undefined
  let lastArgs: TArgs | undefined

  const invoke = () => {
    if (timer) {
      clearTimeout(timer)
      timer = undefined
    }
    if (maxTimer) {
      clearTimeout(maxTimer)
      maxTimer = undefined
    }
    if (lastArgs) {
      const args = lastArgs
      lastArgs = undefined
      fn(...args)
    }
  }

  const debounced = ((...args: TArgs) => {
    lastArgs = args
    if (timer) {
      clearTimeout(timer)
    }
    timer = setTimeout(invoke, waitMs)
    if (options.maxWait !== undefined && !maxTimer) {
      maxTimer = setTimeout(invoke, options.maxWait)
    }
  }) as DebouncedFunction<TArgs>

  debounced.cancel = () => {
    if (timer) {
      clearTimeout(timer)
      timer = undefined
    }
    if (maxTimer) {
      clearTimeout(maxTimer)
      maxTimer = undefined
    }
    lastArgs = undefined
  }

  debounced.flush = () => {
    invoke()
  }

  return debounced
}
