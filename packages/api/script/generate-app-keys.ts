import crypto from 'crypto'
import type { JwtPayload } from 'jsonwebtoken'
import jwt from 'jsonwebtoken'
import { v4 as uuidV4 } from 'uuid'

const appIdentifier = process.argv[2]
const host = process.argv[3]

if (!appIdentifier) {
  throw new Error('Missing appIdentifier arg.')
}
if (!host) {
  throw new Error('Missing host arg.')
}

void new Promise<{ publicKey: string; privateKey: string }>((resolve) =>
  crypto.generateKeyPair(
    'rsa',
    {
      modulusLength: 4096,
      publicKeyEncoding: {
        type: 'spki',
        format: 'pem',
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem',
        cipher: undefined,
        passphrase: undefined,
      },
    },
    (err, publicKey, privateKey) => {
      // Handle errors and use the generated key pair.
      resolve({ publicKey, privateKey })
    },
  ),
).then((keys) => {
  // eslint-disable-next-line no-console
  console.log('keys:', JSON.stringify(keys, null, 2))

  const ALGORITHM = 'RS512'

  const payload: JwtPayload = {
    aud: host,
    jti: uuidV4(),
    scp: [],
    sub: `app:${appIdentifier}`,
  }

  const token = jwt.sign(payload, keys.privateKey, {
    algorithm: ALGORITHM,
    // expiresIn: 60 * 60 * 24 * 31,
  })
  // eslint-disable-next-line no-console
  console.log('app token "%s"', token)

  jwt.verify(token, keys.publicKey)

  return token
})
