import type { JwtPayload } from 'jsonwebtoken'
import jwt from 'jsonwebtoken'
import { v4 as uuidV4 } from 'uuid'

const moduleName = process.argv[2]
const privateKey = process.argv[3]

const ALGORITHM = 'RS512'

const payload: JwtPayload = {
  aud: 'stellariscloud.localhost',
  jti: uuidV4(),
  scp: [],
  sub: `MODULE:${moduleName}`,
}

const token = jwt.sign(payload, privateKey, {
  algorithm: ALGORITHM,
  expiresIn: 60 * 60 * 24 * 31,
})

console.log('token "%s"', token)
