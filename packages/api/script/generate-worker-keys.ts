import crypto from 'crypto'

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
    console.log('privateKey:', privateKey)
    console.log('publicKey:', publicKey)
  },
)
