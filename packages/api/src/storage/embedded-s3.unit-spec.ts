import { afterEach, beforeEach, describe, expect, it } from 'bun:test'

import {
  buildEmbeddedServerStorage,
  buildEmbeddedStorageProvision,
  getEmbeddedS3Config,
  resetEmbeddedS3ConfigCacheForTest,
  rewriteToInternalEndpoint,
} from './embedded-s3'

const EMBEDDED_ENV_KEYS = [
  'EMBEDDED_S3_ACCESS_KEY_ID',
  'EMBEDDED_S3_SECRET_ACCESS_KEY',
  'EMBEDDED_S3_REGION',
  'PLATFORM_HOST',
  'PLATFORM_HTTPS',
  'PLATFORM_PORT',
] as const

function setEmbeddedEnv(overrides: Record<string, string | undefined>): void {
  for (const key of EMBEDDED_ENV_KEYS) {
    Reflect.deleteProperty(process.env, key)
  }
  for (const [key, value] of Object.entries(overrides)) {
    if (value !== undefined) {
      process.env[key] = value
    }
  }
  resetEmbeddedS3ConfigCacheForTest()
}

const PORTED_HTTP = {
  EMBEDDED_S3_ACCESS_KEY_ID: 'GKtest',
  EMBEDDED_S3_SECRET_ACCESS_KEY: 'secret',
  EMBEDDED_S3_REGION: 'auto',
  PLATFORM_HOST: 'lombokdemo.localhost',
  PLATFORM_HTTPS: 'false',
  PLATFORM_PORT: '8090',
}

describe('embedded-s3', () => {
  const saved: Record<string, string | undefined> = {}

  beforeEach(() => {
    for (const key of EMBEDDED_ENV_KEYS) {
      saved[key] = process.env[key]
    }
  })

  afterEach(() => {
    for (const key of EMBEDDED_ENV_KEYS) {
      if (saved[key] === undefined) {
        Reflect.deleteProperty(process.env, key)
      } else {
        process.env[key] = saved[key]
      }
    }
    resetEmbeddedS3ConfigCacheForTest()
  })

  describe('getEmbeddedS3Config', () => {
    it('returns undefined when credentials are absent', () => {
      setEmbeddedEnv({ PLATFORM_HOST: 'lombok.localhost' })
      expect(getEmbeddedS3Config()).toBeUndefined()
    })

    it('builds the public s3.<host>:<port> endpoint for a ported http deployment', () => {
      setEmbeddedEnv(PORTED_HTTP)
      expect(getEmbeddedS3Config()).toMatchObject({
        region: 'auto',
        endpoint: 'http://s3.lombokdemo.localhost:8090',
        publicHost: 's3.lombokdemo.localhost:8090',
      })
    })

    it('omits the port for a TLS-fronted deployment', () => {
      setEmbeddedEnv({
        ...PORTED_HTTP,
        PLATFORM_HTTPS: 'true',
        PLATFORM_PORT: undefined,
      })
      expect(getEmbeddedS3Config()?.endpoint).toBe(
        'https://s3.lombokdemo.localhost',
      )
    })
  })

  describe('buildEmbeddedServerStorage / buildEmbeddedStorageProvision', () => {
    it('returns undefined when embedded config is absent', () => {
      setEmbeddedEnv({})
      expect(buildEmbeddedServerStorage('server-storage')).toBeUndefined()
      expect(buildEmbeddedStorageProvision('provisions')).toBeUndefined()
    })

    it('derives the builtin server storage in its dedicated bucket', () => {
      setEmbeddedEnv(PORTED_HTTP)
      expect(buildEmbeddedServerStorage('server-storage')).toMatchObject({
        bucket: 'server-storage',
        prefix: null,
        endpoint: 'http://s3.lombokdemo.localhost:8090',
      })
    })

    it('derives the id-less builtin provision in its dedicated bucket', () => {
      setEmbeddedEnv(PORTED_HTTP)
      const provision = buildEmbeddedStorageProvision('provisions')
      expect(provision).toMatchObject({
        bucket: 'provisions',
        prefix: null,
        endpoint: 'http://s3.lombokdemo.localhost:8090',
        provisionTypes: ['CONTENT', 'METADATA'],
      })
      expect(provision).not.toHaveProperty('id')
      expect(provision).not.toHaveProperty('builtin')
    })

    it('derives a folder-scoped prefix when given a provision context', () => {
      setEmbeddedEnv(PORTED_HTTP)
      expect(
        buildEmbeddedStorageProvision('provisions', {
          folderId: 'folder-1',
          userId: 'user-1',
        })?.prefix,
      ).toBe('.lombok_provision__user_user-1_folder_folder-1')
    })
  })

  describe('rewriteToInternalEndpoint', () => {
    it('rewrites the embedded public host (incl. port) to loopback', () => {
      setEmbeddedEnv(PORTED_HTTP)
      expect(
        rewriteToInternalEndpoint('http://s3.lombokdemo.localhost:8090'),
      ).toBe('http://127.0.0.1:9000')
    })

    it('leaves a non-embedded endpoint unchanged', () => {
      setEmbeddedEnv(PORTED_HTTP)
      expect(rewriteToInternalEndpoint('https://s3.amazonaws.com')).toBe(
        'https://s3.amazonaws.com',
      )
    })

    it('is a no-op when there is no embedded config', () => {
      setEmbeddedEnv({})
      expect(rewriteToInternalEndpoint('http://anything:9000')).toBe(
        'http://anything:9000',
      )
    })
  })
})
