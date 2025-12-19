import { describe, expect, it } from 'bun:test'

import type { OnCompleteConditionTaskContext } from './eval-oncomplete-condition.util'
import { evalOnCompleteHandlerCondition } from './eval-oncomplete-condition.util'

const successBaseContext: OnCompleteConditionTaskContext = {
  id: 'task-id',
  success: true,
  result: { value: 'ok' },
}

const errorBaseContext: OnCompleteConditionTaskContext = {
  id: 'task-id',
  success: false,
  error: {
    code: 'ERROR_CODE',
    message: 'ERROR_MESSAGE',
    details: { value: 'error' },
  },
}

describe('evalOnCompleteHandlerCondition', () => {
  it('returns true when the condition matches a truthy path', () => {
    expect(
      evalOnCompleteHandlerCondition('task.success', successBaseContext),
    ).toBe(true)
  })

  it('returns false when the condition path resolves to a falsy value', () => {
    expect(
      evalOnCompleteHandlerCondition('task.success', errorBaseContext),
    ).toBe(false)
  })

  it('supports negated conditions', () => {
    expect(
      evalOnCompleteHandlerCondition('!task.success', errorBaseContext),
    ).toBe(true)
  })

  it('evaluates nested properties', () => {
    expect(
      evalOnCompleteHandlerCondition('task.result.value', successBaseContext),
    ).toBe(true)
  })

  it('returns false for unknown paths', () => {
    expect(
      evalOnCompleteHandlerCondition('task.missing.field', successBaseContext),
    ).toBe(false)
  })
})
