import jwt from 'jsonwebtoken'
import { v4 as uuidV4 } from 'uuid'

const ALGORITHM = 'RS512'

const payload = {
  aud: 'worker_access_token',
  jti: uuidV4(),
  scp: [],
  sub: 'worker',
}

const token = jwt.sign(payload, process.argv[2], {
  algorithm: ALGORITHM,
  expiresIn: 60 * 60 * 24 * 31,
})

console.log('token "%s"', token)
