export async function waitForTrue(
  condition: () => boolean,
  { retryPeriod, maxRetries }: { retryPeriod: number; maxRetries: number },
) {
  await new Promise<void>((resolve, reject) => {
    let checkCount = 0
    if (condition()) {
      resolve()
      return
    }
    const interval = setInterval(() => {
      if (checkCount >= maxRetries) {
        clearInterval(interval)
        reject(new Error('Timeout waiting for condition to return true.'))
      } else if (condition()) {
        clearInterval(interval)
        resolve()
      }
      checkCount += 1
    }, retryPeriod)
  })
}
