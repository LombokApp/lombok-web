import crypto from 'crypto'

export function uniqueExecutionKey() {
  return crypto
    .createHash('sha256')
    .update(crypto.randomUUID())
    .digest('hex')
    .substring(0, 8)
    .toLowerCase()
}
