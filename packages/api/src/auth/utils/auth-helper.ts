import * as crypto from 'crypto'

export const authHelper = {
  createPasswordSalt: () => {
    return crypto.randomBytes(64).toString('hex')
  },

  createPasswordHash: (password: string, salt: string) => {
    return crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512')
  },

  createSSOSignature: (data: string, secret: string): string => {
    return crypto.createHmac('sha256', secret).update(data).digest('hex')
  },

  verifySSOSignature: (
    signature: string,
    data: string,
    secret: string,
  ): boolean => {
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(data)
      .digest('hex')
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex'),
    )
  },
}
