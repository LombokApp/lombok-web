import { describe, expect, it } from 'bun:test'

import {
  waitForCondition,
  WaitForConditionError,
  WaitForConditionInvocation,
} from './wait.util'

describe('waitForCondition', () => {
  describe('timeout error', () => {
    it('throws WaitForTrueError with code TIMEOUT when max retries exceeded', () => {
      const condition = () => false

      expect(
        waitForCondition(condition, 'waitForCondition test failure message', {
          retryPeriodMs: 10,
          maxRetries: 1,
          totalMaxDurationMs: 5000,
        }),
      ).rejects.toThrow(WaitForConditionError)
    })

    it('throws WaitForTrueError with code TIMEOUT when total duration exceeded', () => {
      const condition = () => false

      expect(
        waitForCondition(condition, 'waitForCondition test failure message', {
          retryPeriodMs: 1000,
          maxRetries: 100,
          totalMaxDurationMs: 50,
        }),
      ).rejects.toThrow(WaitForConditionError)
    })

    it('includes meaningful stacktrace showing where waitForCondition was invoked', async () => {
      async function callerThatInvokesWaitForTrue() {
        await waitForCondition(
          () => false,
          'waitForCondition test failure message',
          {
            retryPeriodMs: 10,
            maxRetries: 0,
            totalMaxDurationMs: 5000,
          },
        )
      }

      let caught: WaitForConditionError | undefined
      try {
        await callerThatInvokesWaitForTrue()
      } catch (e) {
        caught = e instanceof WaitForConditionError ? e : undefined
      }

      expect(caught).toBeDefined()
      expect(caught?.code).toBe('TIMEOUT')
      expect(caught?.stack).toBeDefined()

      // The stack should show where the utility was first used (callerThatInvokesWaitForTrue),
      // not just where the timeout was detected (inside setTimeout or checkOnce callback).
      expect(caught?.cause).toBeInstanceOf(WaitForConditionInvocation)
      expect(
        (caught?.cause as WaitForConditionInvocation).stack ?? '',
      ).toContain('callerThatInvokesWaitForTrue')
      expect(
        (caught?.cause as WaitForConditionInvocation).stack ?? '',
      ).toContain('wait.util.unit-spec')
    })
  })
})
