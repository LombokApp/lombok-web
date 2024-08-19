export async function withRetry<R>(
  func: (...args: any[]) => Promise<R>,
  retries: number,
  timeout: number,
  onRetry: (i: number, err: any) => void,
  onFailure: (err: any) => void,
): Promise<R> {
  let error
  for (let i = 0; i < retries; i++) {
    try {
      const result = await Promise.race([
        new Promise((resolve) => setTimeout(resolve, timeout)).then(() => {
          throw new Error('TIMEOUT!!')
        }),
        func(),
      ])
      return result
    } catch (e) {
      if (i < retries) {
        onRetry(i, e)
        continue
      }
      onFailure(e)
      error = e
      break
    }
  }
  throw error
}

export type Awaited<T> = T extends PromiseLike<infer U> ? U : T

export type Promisify<T> = T extends (...args: infer A) => infer R
  ? (...args: A) => Promise<R>
  : T
