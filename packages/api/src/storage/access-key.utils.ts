import crypto from 'crypto'

export function buildAccessKeyHashId(input: {
  accessKeyId: string
  secretAccessKey: string
  region: string
  endpoint: string
}) {
  const keys = [
    input.endpoint,
    input.accessKeyId,
    input.secretAccessKey,
    input.region,
  ]
  return crypto
    .createHash('sha1')
    .update(keys.map((k) => encodeURIComponent(k)).join(':'))
    .digest('hex')
}
