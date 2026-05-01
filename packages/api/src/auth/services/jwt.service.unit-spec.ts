import type { JsonSerializableObject } from '@lombokapp/types'
import { describe, expect, it } from 'bun:test'

import type { Session } from '../entities/session.entity'
import { JWTService } from './jwt.service'
import { KeyDerivationService } from './key-derivation.service'

const SECRET = 'a'.repeat(48)

const buildKeyDerivation = async (secret = SECRET) => {
  const svc = new KeyDerivationService({
    authJwtSecret: secret,
    emailVerificationAlgorithm: 'HS' as const,
    emailVerificationPrivateKey: undefined,
    emailVerificationPublicKey: undefined,
    emailVerificationSecret: undefined,
  })
  await svc.onModuleInit()
  return svc
}

const buildJwtService = async () => {
  return new JWTService(
    {
      authJwtSecret: SECRET,
      emailVerificationAlgorithm: 'HS' as const,
      emailVerificationPrivateKey: undefined,
      emailVerificationPublicKey: undefined,
      emailVerificationSecret: undefined,
    },
    { platformHost: 'lombok.test' } as never,
    {} as never,
    await buildKeyDerivation(),
  )
}

const fakeSession = (): Session => ({
  id: '11111111-1111-1111-1111-111111111111',
  hash: 'hash',
  userId: '22222222-2222-2222-2222-222222222222',
  type: 'app_user',
  typeDetails: null,
  expiresAt: new Date(Date.now() + 60_000),
  createdAt: new Date(),
  updatedAt: new Date(),
})

describe('JWTService app token round-trips', () => {
  it('mints and verifies an app actor token', async () => {
    const svc = await buildJwtService()
    const token = await svc.mintAppToken('app1')
    const claims = await svc.verifyAppToken(token)
    expect(claims.actorType).toBe('app')
    expect(claims.appIdentifier).toBe('app1')
  })

  it('mints and verifies an app_user actor token, locking extra into claims', async () => {
    const svc = await buildJwtService()
    const session = fakeSession()
    const extra: JsonSerializableObject = { agent: 'a-1', seat: 7 }
    const token = await svc.createAppUserToken({
      session,
      appIdentifier: 'app1',
      extra,
    })
    const claims = await svc.verifyAppToken(token)
    expect(claims.actorType).toBe('app_user')
    if (claims.actorType !== 'app_user') {
      throw new Error('unreachable')
    }
    expect(claims.userId).toBe(session.userId)
    expect(claims.appIdentifier).toBe('app1')
    expect(claims.extra).toEqual(extra)
  })

  it('mints and verifies an app_user worker-context token with platformAccess override', async () => {
    const svc = await buildJwtService()
    const session = fakeSession()
    const token = await svc.createAppUserToken({
      session,
      appIdentifier: 'app1',
      worker: 'agent-1',
      platformAccess: true,
      extra: { agent: 'a-1' },
    })
    const claims = await svc.verifyAppToken(token)
    expect(claims.actorType).toBe('app_user')
    if (claims.actorType !== 'app_user') {
      throw new Error('unreachable')
    }
    expect(claims.worker).toBe('agent-1')
    expect(claims.platformAccess).toBe(true)
    expect(claims.extra).toEqual({ agent: 'a-1' })
  })

  it('defaults platformAccess to false when worker is set, true otherwise', async () => {
    const svc = await buildJwtService()
    const session = fakeSession()
    const ui = await svc.verifyAppToken(
      await svc.createAppUserToken({ session, appIdentifier: 'app1' }),
    )
    expect(ui.actorType === 'app_user' && ui.platformAccess).toBe(true)
    const worker = await svc.verifyAppToken(
      await svc.createAppUserToken({
        session,
        appIdentifier: 'app1',
        worker: 'agent-1',
      }),
    )
    expect(worker.actorType === 'app_user' && worker.platformAccess).toBe(false)
  })

  it('rejects tokens minted with one secret when verified with another', async () => {
    const a = await buildJwtService()
    const otherKeys = new KeyDerivationService({
      authJwtSecret: 'b'.repeat(64),
      emailVerificationAlgorithm: 'HS' as const,
      emailVerificationPrivateKey: undefined,
      emailVerificationPublicKey: undefined,
      emailVerificationSecret: undefined,
    })
    await otherKeys.onModuleInit()
    const tokenFromA = await a.mintAppToken('app1')
    const b = new JWTService(
      {
        authJwtSecret: 'b'.repeat(64),
        emailVerificationAlgorithm: 'HS' as const,
        emailVerificationPrivateKey: undefined,
        emailVerificationPublicKey: undefined,
        emailVerificationSecret: undefined,
      },
      { platformHost: 'lombok.test' } as never,
      {} as never,
      otherKeys,
    )
    let caught: unknown
    try {
      await b.verifyAppToken(tokenFromA)
    } catch (e) {
      caught = e
    }
    expect(caught).toBeDefined()
  })

  it('rejects extra payloads above 1024 bytes', async () => {
    const svc = await buildJwtService()
    const session = fakeSession()
    const big: JsonSerializableObject = { blob: 'x'.repeat(2048) }
    expect(() =>
      svc.createAppUserToken({ session, appIdentifier: 'app1', extra: big }),
    ).toThrow(/extra/)
  })
})
