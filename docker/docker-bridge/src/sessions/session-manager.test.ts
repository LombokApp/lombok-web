import { afterEach, beforeEach, describe, expect, it } from 'bun:test'

import { SessionManager } from './session-manager.js'

describe('SessionManager', () => {
  let manager: SessionManager

  beforeEach(() => {
    manager = new SessionManager({
      maxSessions: 200,
      sessionIdleTimeout: 1800000,
    })
  })

  afterEach(() => {
    manager.stopSweep()
  })

  describe('create', () => {
    it('creates a framed tunnel session with correct fields', () => {
      const session = manager.create(
        'local',
        'container-1',
        ['/usr/local/bin/tunnel-agent', '--ports', '3000'],
        'preview',
        'coder',
        {
          mode: 'persistent',
          protocol: 'framed',
          tty: false,
          isPublic: true,
        },
      )

      expect(session.id).toMatch(/^sess_/)
      expect(session.containerId).toBe('container-1')
      expect(session.protocol).toBe('framed')
      expect(session.mode).toBe('persistent')
      expect(session.state).toBe('created')
      expect(session.command).toEqual([
        '/usr/local/bin/tunnel-agent',
        '--ports',
        '3000',
      ])
      expect(session.publicId).toMatch(/^[a-f0-9]{12}$/)
      expect(session.label).toBe('preview')
      expect(session.appId).toBe('coder')
      expect(session.agentReady).toBe(false)
    })

    it('creates a raw tunnel session with correct fields', () => {
      const session = manager.create(
        'local',
        'container-1',
        ['/bin/bash'],
        'terminal',
        'coder',
        {
          mode: 'ephemeral',
          protocol: 'raw',
          tty: false,
          isPublic: true,
        },
      )

      expect(session.id).toMatch(/^sess_/)
      expect(session.containerId).toBe('container-1')
      expect(session.protocol).toBe('raw')
      expect(session.mode).toBe('ephemeral')
      expect(session.state).toBe('created')
      expect(session.command).toEqual(['/bin/bash'])
      expect(session.execId).toBeNull()
      expect(session.execStream).toBeNull()
      expect(session.clients.size).toBe(0)
    })

    it('supports ephemeral mode', () => {
      const session = manager.create(
        'local',
        'container-1',
        ['/usr/local/bin/tunnel-agent', '--ports', '3000'],
        'terminal',
        'coder',
        {
          mode: 'ephemeral',
          protocol: 'framed',
          tty: false,
          isPublic: true,
        },
      )

      expect(session.mode).toBe('ephemeral')
    })

    it('allows multiple tunnels per container with different publicIds', () => {
      const first = manager.create(
        'local',
        'container-1',
        ['/usr/local/bin/tunnel-agent', '--ports', '3000'],
        'preview',
        'coder',
        {
          mode: 'persistent',
          protocol: 'framed',
          tty: false,
          isPublic: true,
        },
      )
      const second = manager.create(
        'local',
        'container-1',
        ['/usr/local/bin/tunnel-agent', '--ports', '5173'],
        'api',
        'coder',
        {
          mode: 'persistent',
          protocol: 'framed',
          tty: false,
          isPublic: true,
        },
      )

      expect(first.id).not.toBe(second.id)
      expect(manager.size).toBe(2)
    })
  })

  describe('getByPublicId', () => {
    it('looks up tunnel session by publicId', () => {
      const session = manager.create(
        'local',
        'container-1',
        ['/usr/local/bin/tunnel-agent', '--ports', '3000'],
        'preview',
        'coder',
        {
          mode: 'persistent',
          protocol: 'framed',
          tty: false,
          isPublic: true,
        },
      )

      const found = manager.getByPublicId(session.publicId!)
      expect(found).toBeDefined()
      expect(found!.id).toBe(session.id)
    })

    it('returns undefined for unknown publicId', () => {
      expect(manager.getByPublicId('nonexistent')).toBeUndefined()
    })
  })

  describe('MAX_SESSIONS limit', () => {
    it('throws 503 when limit exceeded', () => {
      const small = new SessionManager({
        maxSessions: 2,
        sessionIdleTimeout: 1800000,
      })

      small.create('local', 'c1', ['/bin/sh'], 'term', 'app', {
        mode: 'ephemeral',
        protocol: 'raw',
        tty: false,
        isPublic: true,
      })
      small.create('local', 'c2', ['/bin/sh'], 'term', 'app', {
        mode: 'ephemeral',
        protocol: 'raw',
        tty: false,
        isPublic: true,
      })

      try {
        small.create('local', 'c3', ['/bin/sh'], 'term', 'app', {
          mode: 'ephemeral',
          protocol: 'raw',
          tty: false,
          isPublic: true,
        })
        expect(true).toBe(false)
      } catch (err: unknown) {
        expect((err as Error).message).toContain('Maximum session limit')
        expect((err as Error & { statusCode: number }).statusCode).toBe(503)
      }
    })
  })

  describe('delete', () => {
    it('removes session and tunnel index entry', () => {
      const session = manager.create(
        'local',
        'container-1',
        ['/usr/local/bin/tunnel-agent', '--ports', '3000'],
        'preview',
        'coder',
        {
          mode: 'persistent',
          protocol: 'framed',
          tty: false,
          isPublic: true,
        },
      )

      expect(manager.get(session.id)).toBeDefined()
      expect(session.publicId).not.toBeNull()
      expect(manager.getByPublicId(session.publicId!)).toBeDefined()

      manager.delete(session.id)

      expect(manager.get(session.id)).toBeUndefined()
      expect(manager.getByPublicId(session.publicId!)).toBeUndefined()
    })
  })

  describe('sweep', () => {
    it('removes idle sessions past timeout', async () => {
      const small = new SessionManager({
        maxSessions: 200,
        sessionIdleTimeout: 50, // 50ms for test
      })

      const session = small.create('local', 'c1', ['/bin/sh'], 'term', 'app', {
        mode: 'ephemeral',
        protocol: 'raw',
        tty: false,
        isPublic: true,
      })

      // Wait for session to become idle
      await new Promise((resolve) => setTimeout(resolve, 60))

      small.startSweep(10)
      await new Promise((resolve) => setTimeout(resolve, 30))

      expect(small.get(session.id)).toBeUndefined()
      small.stopSweep()
    })

    it('removes unattached created sessions past 60s', async () => {
      const session = manager.create(
        'local',
        'c1',
        ['/bin/sh'],
        'term',
        'app',
        {
          mode: 'ephemeral',
          protocol: 'raw',
          tty: false,
          isPublic: true,
        },
      )

      // Simulate old creation time (70s ago)
      session.createdAt = Date.now() - 70_000
      // But keep lastActivityAt recent so idle timeout doesn't trigger
      session.lastActivityAt = Date.now()

      manager.startSweep(10)
      await new Promise((resolve) => setTimeout(resolve, 30))

      expect(manager.get(session.id)).toBeUndefined()
      manager.stopSweep()
    })
  })

  describe('list', () => {
    it('filters by containerId', () => {
      manager.create('local', 'c1', ['/bin/sh'], 'term', 'app', {
        mode: 'ephemeral',
        protocol: 'raw',
        tty: false,
        isPublic: true,
      })
      manager.create('local', 'c2', ['/bin/sh'], 'term', 'app', {
        mode: 'ephemeral',
        protocol: 'raw',
        tty: false,
        isPublic: true,
      })

      const sessions = manager.list({ containerId: 'c1' })
      expect(sessions).toHaveLength(1)
      expect(sessions[0].containerId).toBe('c1')
    })

    it('returns all sessions without filter', () => {
      manager.create('local', 'c1', ['/bin/sh'], 'term', 'app', {
        mode: 'ephemeral',
        protocol: 'raw',
        tty: false,
        isPublic: true,
      })
      manager.create(
        'local',
        'c2',
        ['/usr/local/bin/tunnel-agent', '--ports', '3000'],
        'preview',
        'coder',
        {
          mode: 'persistent',
          protocol: 'framed',
          tty: false,
          isPublic: true,
        },
      )

      const sessions = manager.list()
      expect(sessions).toHaveLength(2)
    })
  })

  describe('touch', () => {
    it('updates lastActivityAt', async () => {
      const session = manager.create(
        'local',
        'c1',
        ['/bin/sh'],
        'term',
        'app',
        {
          mode: 'ephemeral',
          protocol: 'raw',
          tty: false,
          isPublic: true,
        },
      )
      const original = session.lastActivityAt

      await new Promise((resolve) => setTimeout(resolve, 10))
      manager.touch(session.id)

      const updated = manager.get(session.id)!
      expect(updated.lastActivityAt).toBeGreaterThan(original)
    })
  })
})
