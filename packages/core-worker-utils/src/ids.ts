import crypto from 'crypto'
import { v4 as uuidV4 } from 'uuid'

export function uniqueExecutionKey() {
  return crypto
    .createHash('sha256')
    .update(uuidV4())
    .digest('hex')
    .substring(0, 8)
    .toLowerCase()
}
