import { describe, expect, it } from 'bun:test'

import { KeyDerivationService } from './key-derivation.service'

const buildService = async (secret: string) => {
  const service = new KeyDerivationService({
    authJwtSecret: secret,
    emailVerificationAlgorithm: 'HS' as const,
    emailVerificationPrivateKey: undefined,
    emailVerificationPublicKey: undefined,
    emailVerificationSecret: undefined,
  })
  await service.onModuleInit()
  return service
}

describe('KeyDerivationService', () => {
  it('derives a deterministic Ed25519 keypair from the JWT secret', async () => {
    const secret = 'a'.repeat(48)
    const a = await buildService(secret)
    const b = await buildService(secret)
    expect(a.getPublicKeyPem()).toBe(b.getPublicKeyPem())
    expect(a.getPrivateKeyPem()).toBe(b.getPrivateKeyPem())
  })

  it('changes the keypair when the secret changes', async () => {
    const a = await buildService('a'.repeat(48))
    const b = await buildService('b'.repeat(48))
    expect(a.getPublicKeyPem()).not.toBe(b.getPublicKeyPem())
  })

  it('rejects secrets shorter than 32 bytes', async () => {
    let caught: unknown
    try {
      await buildService('short')
    } catch (e) {
      caught = e
    }
    expect(caught).toBeInstanceOf(Error)
    expect((caught as Error).message).toMatch(
      /AUTH_JWT_SECRET must be at least 32 bytes/,
    )
  })

  it('emits Ed25519 PEMs', async () => {
    const service = await buildService('z'.repeat(64))
    expect(service.getPublicKeyPem()).toContain('-----BEGIN PUBLIC KEY-----')
    expect(service.getPrivateKeyPem()).toContain('-----BEGIN PRIVATE KEY-----')
  })
})
