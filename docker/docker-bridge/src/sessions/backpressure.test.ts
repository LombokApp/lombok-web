import { describe, expect, test } from 'bun:test'

import { SessionConcurrencyLimiter, WriteSerializer } from './backpressure.js'

describe('SessionConcurrencyLimiter', () => {
  test('acquire succeeds when under limit', () => {
    const limiter = new SessionConcurrencyLimiter()
    limiter.register('s1', 3)

    expect(limiter.acquire('s1')).toBe(true)
    expect(limiter.getInFlight('s1')).toBe(1)
  })

  test('acquire fails when at limit', () => {
    const limiter = new SessionConcurrencyLimiter()
    limiter.register('s1', 2)

    expect(limiter.acquire('s1')).toBe(true)
    expect(limiter.acquire('s1')).toBe(true)
    expect(limiter.acquire('s1')).toBe(false)
    expect(limiter.getInFlight('s1')).toBe(2)
  })

  test('release allows subsequent acquire', () => {
    const limiter = new SessionConcurrencyLimiter()
    limiter.register('s1', 1)

    expect(limiter.acquire('s1')).toBe(true)
    expect(limiter.acquire('s1')).toBe(false)

    limiter.release('s1')
    expect(limiter.getInFlight('s1')).toBe(0)
    expect(limiter.acquire('s1')).toBe(true)
  })

  test('unregister cleans up', () => {
    const limiter = new SessionConcurrencyLimiter()
    limiter.register('s1', 10)
    limiter.acquire('s1')

    limiter.unregister('s1')
    expect(limiter.getInFlight('s1')).toBe(0)
    expect(limiter.acquire('s1')).toBe(false) // not registered
  })

  test('acquire returns false for unregistered session', () => {
    const limiter = new SessionConcurrencyLimiter()
    expect(limiter.acquire('unknown')).toBe(false)
  })

  test('release on unregistered session is a no-op', () => {
    const limiter = new SessionConcurrencyLimiter()
    // Should not throw
    limiter.release('unknown')
  })

  test('concurrent acquires respect limit', () => {
    const limiter = new SessionConcurrencyLimiter()
    limiter.register('s1', 5)

    const results: boolean[] = []
    for (let i = 0; i < 7; i++) {
      results.push(limiter.acquire('s1'))
    }

    expect(results).toEqual([true, true, true, true, true, false, false])
    expect(limiter.getInFlight('s1')).toBe(5)
  })

  test('sessions are independent', () => {
    const limiter = new SessionConcurrencyLimiter()
    limiter.register('s1', 1)
    limiter.register('s2', 1)

    expect(limiter.acquire('s1')).toBe(true)
    expect(limiter.acquire('s2')).toBe(true) // s2 unaffected by s1
    expect(limiter.acquire('s1')).toBe(false)
    expect(limiter.acquire('s2')).toBe(false)
  })

  test('release does not go below zero', () => {
    const limiter = new SessionConcurrencyLimiter()
    limiter.register('s1', 5)

    limiter.release('s1')
    limiter.release('s1')
    expect(limiter.getInFlight('s1')).toBe(0)
  })
})

describe('WriteSerializer', () => {
  test('serializes writes in order', async () => {
    const serializer = new WriteSerializer()
    const write = serializer.getWriter('s1')

    const order: number[] = []
    const mockWs = {
      send: (data: string | Buffer) => {
        order.push(Number(data))
      },
    }

    await write(mockWs, '1')
    await write(mockWs, '2')
    await write(mockWs, '3')

    expect(order).toEqual([1, 2, 3])
  })

  test('remove cleans up session chain', async () => {
    const serializer = new WriteSerializer()
    const write = serializer.getWriter('s1')

    const mockWs = { send: () => {} }
    await write(mockWs, 'data')

    serializer.remove('s1')
    // Getting a new writer after remove should still work
    const write2 = serializer.getWriter('s1')
    const sent: string[] = []
    const mockWs2 = { send: (d: string | Buffer) => sent.push(String(d)) }
    await write2(mockWs2, 'after-remove')
    expect(sent).toEqual(['after-remove'])
  })

  test('write error does not block subsequent writes', async () => {
    const serializer = new WriteSerializer()
    const write = serializer.getWriter('s1')

    let callCount = 0
    const errorWs = {
      send: () => {
        callCount++
        if (callCount === 1) {
          throw new Error('send failed')
        }
      },
    }

    // First write will fail
    try {
      await write(errorWs, 'fail')
    } catch {
      // expected
    }

    // Second write should still proceed (chain not stuck)
    const sent: string[] = []
    const okWs = { send: (d: string | Buffer) => sent.push(String(d)) }
    await write(okWs, 'ok')
    expect(sent).toEqual(['ok'])
  })
})
