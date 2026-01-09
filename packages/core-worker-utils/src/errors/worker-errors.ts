import {
  type JsonSerializableObject,
  jsonSerializableObjectWithUndefinedSchema,
  type RequeueConfig,
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
  readonly requeue?: RequeueConfig
  readonly code: string
  readonly details?: JsonSerializableObject
  readonly cause?: AsyncWorkError

  constructor(args: AsyncWorkErrorConstructorArg) {
    super(args.message)
    this.name = args.name
    this.origin = args.origin
    this.requeue = args.requeue
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
      requeue: this.requeue,
      message: this.message,
      stack: this.stack,
    }
  }

  static fromEnvelope(_env: AsyncWorkErrorConstructorArg): AsyncWorkError {
    throw new Error('Use ErrorRegistry to materialise typed errors')
  }
}

export class NotReadyAsyncWorkError extends AsyncWorkError {
  constructor(args: Omit<AsyncWorkErrorConstructorArg, 'origin' | 'class'>) {
    super({
      ...args,
      origin: 'internal',
      class: 'transient',
      requeue: args.requeue,
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
      'requeue' | 'code'
    >,
  ) {
    super({
      ...args,
      origin: 'internal',
      class: 'transient',
      ...(args.requeue ? { requeue: args.requeue } : {}),
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
      class: 'permanent',
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
      class: 'permanent',
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
