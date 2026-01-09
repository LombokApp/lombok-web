import { AppTaskError } from '@lombokapp/app-worker-sdk'
import type { JsonSerializableObject } from '@lombokapp/types'
import { AsyncWorkError } from '@lombokapp/worker-utils'

const MAX_STRING_LENGTH = 256
const MAX_STACK_LENGTH = 2048

const validateAppTaskError = (
  error: unknown,
): [boolean, string | undefined] => {
  if (!(error instanceof AppTaskError)) {
    return [false, 'Error must be an instance of AppTaskError']
  }
  if (
    'requeueDelayMs' in error &&
    typeof error.requeueDelayMs !== 'undefined' &&
    (typeof error.requeueDelayMs !== 'number' ||
      error.requeueDelayMs < 0 ||
      Math.floor(error.requeueDelayMs) !== error.requeueDelayMs)
  ) {
    return [false, 'Requeue delay must be a non-negative number']
  }

  if (!('code' in error)) {
    return [false, 'Code is required']
  }

  if (typeof error.code !== 'string') {
    return [false, 'Code must be a string']
  }

  if (!('name' in error)) {
    return [false, 'Name is required']
  }

  if (typeof error.name !== 'string') {
    return [false, 'Name must be a string']
  }

  if (!('message' in error)) {
    return [false, 'Message is required']
  }

  if (typeof error.message !== 'string') {
    return [false, 'Message must be a string']
  }

  return [true, undefined]
}

export const getAsyncWorkErrorFromAppTaskError = (
  error: AppTaskError,
  stack?: string,
) => {
  const serializableAppTaskError = {
    name: error.name,
    code: error.code,
    requeueDelayMs: error.requeueDelayMs,
    message: error.message,
    stack: error.stack,
  }

  const [appTaskErrorValidationSuccess, errorMessage] =
    validateAppTaskError(error)

  if (appTaskErrorValidationSuccess) {
    return new AsyncWorkError({
      name: 'Error',
      origin: 'internal',
      message: 'App threw an AppTaskError',
      code: 'APP_TASK_ERROR',
      stack,
      cause: {
        origin: 'app',
        name: error.name.slice(0, MAX_STRING_LENGTH),
        code: error.code.slice(0, MAX_STRING_LENGTH),
        requeueDelayMs: error.requeueDelayMs,
        message: error.message.slice(0, MAX_STRING_LENGTH),
        stack: error.stack?.slice(0, MAX_STACK_LENGTH),
      },
    })
  }

  let originalError: JsonSerializableObject | undefined = undefined
  try {
    originalError = JSON.parse(
      JSON.stringify(serializableAppTaskError),
    ) as JsonSerializableObject
  } catch {
    void 0
  }

  return new AsyncWorkError({
    name: 'Error',
    origin: 'internal',
    message: 'App threw an AppTaskError which was invalid',
    code: 'APP_THREW_INVALID_APP_TASK_ERROR',
    stack: new Error().stack,
    cause: {
      origin: 'app',
      name: 'InvalidAppTaskError',
      code: 'INVALID_APP_TASK_ERROR',
      message: 'The thrown AppTaskError was invalid',
      stack,
      details: {
        originalError: originalError ?? {
          error: 'Could not serialize original AppTaskError',
        },
        validationError: errorMessage ?? 'Could not validate AppTaskError',
      },
    },
  })
}
