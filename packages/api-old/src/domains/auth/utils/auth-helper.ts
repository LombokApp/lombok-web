import crypto from 'crypto'

export const authHelper = {
  createPasswordSalt: () => {
    return crypto.randomBytes(64).toString('hex')
  },

  createPasswordHash: (password: string, salt: string) => {
    return crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512')
  },
}
