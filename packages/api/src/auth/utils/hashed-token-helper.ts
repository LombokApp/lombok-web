import crypto from 'crypto'

export const hashedTokenHelper = {
  createSecretKey: (length: number = 32) => {
    return crypto.randomBytes(length)
  },

  createHash: (secret: Buffer) => {
    return crypto.createHash('SHA512').update(secret).digest('hex')
  },

  decodeRefreshToken: (refreshToken: string) => {
    // eslint-disable-next-line prefer-const
    let [id = '', secret = ''] = refreshToken.split(':')

    secret = secret.replace(/-/g, '+').replace(/_/g, '/')

    while (secret.length % 4) {
      secret += '='
    }

    return [id, Buffer.from(secret, 'base64')] as const
  },

  encode: (id: string, secret: Buffer) => {
    const encoded = secret
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '')

    return [id, encoded].join(':')
  },
}
