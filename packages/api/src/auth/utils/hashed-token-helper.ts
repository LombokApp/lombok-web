import { UnauthorizedException } from '@nestjs/common'
import * as crypto from 'crypto'
import * as z from 'zod'

export const hashedTokenHelper = {
  createSecretKey: (length = 32) => {
    return crypto.randomBytes(length)
  },

  createHash: (secret: Buffer) => {
    return crypto.createHash('SHA512').update(secret).digest('hex')
  },

  decodeRefreshToken: (refreshToken: string) => {
    // eslint-disable-next-line prefer-const
    let [id = '', secret = ''] = refreshToken.split(':')

    secret = secret.replace(/-/g, '+').replace(/_/g, '/')
    if (
      !id.length ||
      !secret.length ||
      !z.string().uuid().safeParse(id).success
    ) {
      throw new UnauthorizedException()
    }

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
