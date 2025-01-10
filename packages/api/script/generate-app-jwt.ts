import type { JwtPayload } from 'jsonwebtoken'
import jwt from 'jsonwebtoken'
import { v4 as uuidV4 } from 'uuid'

const appIdentifier = process.argv[2]
const privateKey = process.argv[3]

const ALGORITHM = 'RS512'

if (!appIdentifier) {
  throw new Error('Missing appIdentifier arg.')
}

const payload: JwtPayload = {
  aud: 'stellariscloud.localhost',
  jti: uuidV4(),
  scp: [],
  sub: `APP:${appIdentifier}`,
}

const token = jwt.sign(payload, privateKey, {
  algorithm: ALGORITHM,
  expiresIn: 60 * 60 * 24 * 31,
})

// eslint-disable-next-line no-console
console.log('token "%s"', token)
