import {
  type JsonSerializableObject,
  jsonSerializableObjectWithUndefinedSchema,
} from '@lombokapp/types'
import type { NullablePartial } from '@lombokapp/utils'

import type { AsyncWorkErrorEnvelope, ErrorOrigin } from './work-errors.types'

export type AsyncWorkErrorConstructorArg = Omit<
  AsyncWorkErrorEnvelope,
  'cause'
> & {
  cause?: AsyncWorkErrorEnvelope | AsyncWorkError
}

export class AsyncWorkError extends Error {
  readonly name: string
  readonly origin: ErrorOrigin
  readonly requeueDelayMs?: number
  readonly code: string
  readonly details?: JsonSerializableObject
  readonly cause?: AsyncWorkError

  constructor(args: AsyncWorkErrorConstructorArg) {
    super(args.message)
    this.name = args.name
    this.origin = args.origin
    this.requeueDelayMs = args.requeueDelayMs
    this.code = args.code
    this.details = args.details
    this.stack = args.stack
    this.cause = args.cause
      ? args.cause instanceof AsyncWorkError
        ? args.cause
        : new AsyncWorkError(args.cause)
      : undefined
  }

  toEnvelope(): AsyncWorkErrorEnvelope {
    return {
      name: this.name,
      origin: this.origin,
      code: this.code,
      details: this.details,
      cause: this.cause?.toEnvelope(),
      requeueDelayMs: this.requeueDelayMs,
      message: this.message,
      stack: this.stack,
    }
  }

  resolveHighestLevelAppError(): AsyncWorkError | undefined {
    return AsyncWorkError.resolveHighestLevelAppError(this)
  }

  static resolveHighestLevelAppError(
    _error: AsyncWorkError,
  ): AsyncWorkError | undefined {
    if (_error.origin === 'app') {
      return _error
    }
    if (_error.cause) {
      return AsyncWorkError.resolveHighestLevelAppError(_error.cause)
    }
  }

  static fromEnvelope(_env: AsyncWorkErrorConstructorArg): AsyncWorkError {
    return new AsyncWorkError(_env)
  }
}

export class NotReadyAsyncWorkError extends AsyncWorkError {
  constructor(args: Omit<AsyncWorkErrorConstructorArg, 'origin' | 'class'>) {
    super({
      ...args,
      origin: 'internal',
      requeueDelayMs: args.requeueDelayMs,
      code: args.code,
      message: args.message,
      stack: args.stack,
      details: args.details,
    })
  }
}

export class AsyncWorkDispatchError extends AsyncWorkError {
  constructor(
    args: NullablePartial<
      Omit<AsyncWorkErrorConstructorArg, 'origin' | 'class'>,
      'requeueDelayMs' | 'code'
    >,
  ) {
    super({
      ...args,
      origin: 'internal',
      ...(args.requeueDelayMs ? { requeueDelayMs: args.requeueDelayMs } : {}),
      code: args.code ?? 'DISPATCH_ERROR',
      message: args.message,
      stack: args.stack,
      details: args.details,
    })
  }
}

export class AppNotFoundError extends AsyncWorkError {
  constructor(
    args: Omit<
      AsyncWorkErrorConstructorArg,
      'origin' | 'requeue' | 'class' | 'code'
    >,
  ) {
    super({
      ...args,
      origin: 'app',
      code: 'APP_NOT_FOUND',
      message: args.message,
      stack: args.stack,
      details: args.details,
    })
  }
}

export class AppWorkerNotFoundError extends AsyncWorkError {
  constructor(
    args: Omit<
      AsyncWorkErrorConstructorArg,
      'origin' | 'class' | 'requeue' | 'code'
    >,
  ) {
    super({
      ...args,
      origin: 'app',
      code: 'APP_WORKER_NOT_FOUND',
      message: args.message,
      stack: args.stack,
      details: args.details,
    })
  }
}

const stringifyError = (cause: unknown): string => {
  if (cause instanceof Error) {
    return JSON.stringify({
      name: cause.name,
      message: cause.message,
      stack: cause.stack,
      cause: cause.cause ? stringifyError(cause.cause) : undefined,
    })
  }

  if (jsonSerializableObjectWithUndefinedSchema.safeParse(cause).success) {
    try {
      return JSON.stringify(cause)
    } catch {
      void 0
    }
  }
  return String(cause)
}

export const convertUnknownThrownToSerializable = (
  thrown: unknown,
): JsonSerializableObject => {
  return JSON.parse(stringifyError(thrown)) as JsonSerializableObject
}

export const convertErrorToAsyncWorkError = (
  error: Error,
  wrapper?: {
    name: string
    origin?: ErrorOrigin
    code: string
    details?: JsonSerializableObject
    message: string
    stack?: string
  },
): AsyncWorkError => {
  if (error instanceof AsyncWorkError) {
    return wrapper
      ? new AsyncWorkError({
          ...error,
          ...wrapper,
          origin: wrapper.origin ?? 'internal',
          details: wrapper.details,
          cause: convertErrorToAsyncWorkError(error),
        })
      : error
  }
  const errorRepr = {
    origin: 'internal' as const,
    code: 'code' in error ? String(error.code) : 'ERROR',
    name: error.name,
    message: error.message,
    stack: error.stack ?? new Error().stack,
    cause:
      'cause' in error && error.cause instanceof Error
        ? convertErrorToAsyncWorkError(error.cause)
        : undefined,
  }

  return wrapper
    ? new AsyncWorkError({
        ...wrapper,
        origin: wrapper.origin ?? 'internal',
        cause: new AsyncWorkError(errorRepr),
      })
    : new AsyncWorkError(errorRepr)
}

export const buildUnexpectedError = ({
  code,
  message,
  error,
  isAppError = false,
  details,
}: {
  code: string
  message: string
  error: unknown
  isAppError?: boolean
  details?: JsonSerializableObject
}) => {
  const normalizedError =
    error instanceof Error ? error : new Error(String(error))

  return new AsyncWorkError({
    origin: 'internal',
    code,
    message,
    name: 'UnexpectedError',
    stack: new Error().stack,
    cause:
      error instanceof Error
        ? {
            origin: isAppError ? 'app' : 'internal',
            code: 'UNEXPECTED_ERROR',
            name: normalizedError.name,
            message: normalizedError.message,
            stack: normalizedError.stack,
            ...(normalizedError.cause
              ? {
                  details: {
                    originalCause: convertUnknownThrownToSerializable(
                      normalizedError.cause,
                    ),
                  },
                }
              : {}),
          }
        : {
            origin: 'internal',
            code: 'THROWN_NON_ERROR',
            name: 'UnexpectedError',
            message: 'Non-error object thrown',
            details: {
              serializedCause: convertUnknownThrownToSerializable(error),
            },
          },
    details,
  })
}
