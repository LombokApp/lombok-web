import jwt from 'jsonwebtoken'
import { v4 as uuidV4 } from 'uuid'

const ALGORITHM = 'RS512'

const payload = {
  aud: 'stellariscloud.localhost',
  jti: uuidV4(),
  scp: [],
  sub: 'MODULE',
}

const token = jwt.sign(payload, process.argv[2], {
  algorithm: ALGORITHM,
  expiresIn: 60 * 60 * 24 * 31,
})

console.log('token "%s"', token)
