import crypto from 'crypto'

export const verifyHMAC = (
  hmacDigest: string,
  secret: string,
  data: string,
): boolean => {
  const hmac = crypto.createHmac('sha256', secret).update(data)
  return hmac.digest('hex') === hmacDigest
}

export const generateNonce = () => crypto.randomBytes(64).toString('hex')

export const hashData = (data: Buffer): string =>
  crypto.createHash('sha1').update(data).digest('hex')
