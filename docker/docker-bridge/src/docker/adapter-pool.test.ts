import { describe, expect, it } from 'bun:test'

import type { DockerHostEntry } from '../config.js'
import { AdapterPool } from './adapter-pool.js'

const HOSTS: Record<string, DockerHostEntry> = {
  local: { type: 'docker_endpoint', host: '/var/run/docker.sock' },
  remote: { type: 'docker_endpoint', host: 'http://remote:2375' },
}

describe('AdapterPool', () => {
  it('returns an adapter for a configured host', () => {
    const pool = new AdapterPool(HOSTS)
    const adapter = pool.get('local')
    expect(adapter).toBeDefined()
  })

  it('caches adapters (same instance on second call)', () => {
    const pool = new AdapterPool(HOSTS)
    const a1 = pool.get('local')
    const a2 = pool.get('local')
    expect(a1).toBe(a2)
  })

  it('throws for unknown host ID', () => {
    const pool = new AdapterPool(HOSTS)
    expect(() => pool.get('nonexistent')).toThrow('Unknown Docker host')
  })

  it('reports has() correctly', () => {
    const pool = new AdapterPool(HOSTS)
    expect(pool.has('local')).toBe(true)
    expect(pool.has('remote')).toBe(true)
    expect(pool.has('nonexistent')).toBe(false)
  })

  it('returns all host IDs', () => {
    const pool = new AdapterPool(HOSTS)
    const ids = pool.hostIds()
    expect(ids).toContain('local')
    expect(ids).toContain('remote')
    expect(ids).toHaveLength(2)
  })

  it('creates separate adapters for different hosts', () => {
    const pool = new AdapterPool(HOSTS)
    const local = pool.get('local')
    const remote = pool.get('remote')
    expect(local).not.toBe(remote)
  })

  it('throws for unsupported host type', () => {
    const pool = new AdapterPool({
      bad: { type: 'kubernetes', host: 'k8s://cluster' },
    })
    expect(() => pool.get('bad')).toThrow('Unsupported Docker host type')
  })

  describe('updateHosts', () => {
    it('removes adapters for deleted hosts', () => {
      const pool = new AdapterPool(HOSTS)
      pool.get('local') // create cached adapter
      pool.get('remote') // create cached adapter

      pool.updateHosts({
        local: { type: 'docker_endpoint', host: '/var/run/docker.sock' },
      })

      expect(pool.has('local')).toBe(true)
      expect(pool.has('remote')).toBe(false)
      expect(() => pool.get('remote')).toThrow('Unknown Docker host')
    })

    it('invalidates adapter cache when host config changes', () => {
      const pool = new AdapterPool(HOSTS)
      const original = pool.get('local')

      pool.updateHosts({
        local: { type: 'docker_endpoint', host: 'http://new-host:2375' },
        remote: HOSTS.remote,
      })

      const updated = pool.get('local')
      expect(updated).not.toBe(original)
    })

    it('preserves adapter cache when host config unchanged', () => {
      const pool = new AdapterPool(HOSTS)
      const original = pool.get('local')

      pool.updateHosts({ ...HOSTS })

      const same = pool.get('local')
      expect(same).toBe(original)
    })
  })
})
