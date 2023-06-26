import type { RedisOptions } from 'ioredis'
import IORedis from 'ioredis'

// Recommended `reconnectOnError` configuration when using AWS ElastiCache
// See https://github.com/luin/ioredis#reconnect-on-error.
export const reconnectOnError = (error: Error) => {
  if (error.message.includes('READONLY')) {
    return 2
  }
  return false
}

// Bullmq simply hangs with an unresolved promise when it encounters an
// "ECONNREFUSED" error. There is no way to detect this in the current version
// of the lib. Surprisingly, this behavior is considered an improvement. WTF.
// See https://github.com/taskforcesh/bullmq/commit/54ec979a8b2f821894b7ed756ee1262939aa1fa2.
//
// To workaround this and actually detect connection errors we use this function
// to test if a redis connection works and return any encountered error.
export const checkConnection = async (opts: RedisOptions) => {
  return new Promise<void>((resolve, reject) => {
    const client = new IORedis(opts)

    client.once('ready', () => {
      client.disconnect()
      resolve()
    })

    client.once('error', (error: Error) => {
      client.disconnect()
      reject(error)
    })
  })
}
