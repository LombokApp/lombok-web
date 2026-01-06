import type { JsonSerializableObject } from '@lombokapp/types'
import type { NullablePartial } from '@lombokapp/utils'

import type {
  AsyncWorkErrorEnvelope,
  ErrorClass,
  ErrorOrigin,
} from './work-errors.types'

export type AsyncWorkErrorConstructorArg = Omit<
  AsyncWorkErrorEnvelope,
  'cause'
> & {
  cause?: AsyncWorkErrorEnvelope | AsyncWorkError
} & (
    | {
        retry: true
        retryDelaySeconds?: number
      }
    | {
        retry: false
      }
  )

export class AsyncWorkError extends Error {
  readonly origin: ErrorOrigin
  readonly class: ErrorClass
  readonly retry:
    | {
        retry: true
        retryDelaySeconds?: number
      }
    | {
        retry: false
      }
  readonly code: string
  readonly details?: JsonSerializableObject
  readonly cause?: AsyncWorkError

  constructor(args: AsyncWorkErrorConstructorArg) {
    super(args.message)
    this.origin = args.origin
    this.class = args.class
    this.retry = args.retry
      ? {
          retry: true,
          retryDelaySeconds: (args as { retryDelaySeconds?: number })
            .retryDelaySeconds,
        }
      : { retry: false }
    this.code = args.code
    this.details = args.details
    this.cause = args.cause
      ? args.cause instanceof AsyncWorkError
        ? args.cause
        : new AsyncWorkError(args.cause)
      : undefined
  }

  toEnvelope(): AsyncWorkErrorEnvelope {
    return {
      origin: this.origin,
      class: this.class,
      code: this.code,
      details: this.details,
      cause: this.cause?.toEnvelope(),
      retry: this.retry.retry,
      ...(this.retry.retry
        ? { retryDelaySeconds: this.retry.retryDelaySeconds }
        : {}),
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
      retry: args.retry,
      retryDelaySeconds: args.retry
        ? ((args as { retryDelaySeconds?: number }).retryDelaySeconds ?? 10)
        : undefined,
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
      'retry' | 'code'
    >,
  ) {
    super({
      ...args,
      origin: 'internal',
      class: 'transient',
      retry: args.retry ?? false,
      retryDelaySeconds: args.retry
        ? ((args as { retryDelaySeconds?: number }).retryDelaySeconds ?? 10)
        : undefined,
      code: args.code ?? 'DISPATCH_ERROR',
      message: args.message,
      stack: args.stack,
      details: args.details,
    })
  }
}

export class AppWorkerInvalidContentError extends AsyncWorkError {
  constructor(
    args: Omit<
      AsyncWorkErrorConstructorArg,
      'origin' | 'retry' | 'class' | 'retryDelaySeconds'
    >,
  ) {
    super({
      ...args,
      origin: 'app',
      class: 'permanent',
      retry: false,
      code: args.code,
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
      'origin' | 'retry' | 'class' | 'code' | 'retryDelaySeconds'
    >,
  ) {
    super({
      ...args,
      origin: 'app',
      class: 'permanent',
      retry: false,
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
      'origin' | 'class' | 'retry' | 'code' | 'retryDelaySeconds'
    >,
  ) {
    super({
      ...args,
      origin: 'app',
      class: 'permanent',
      retry: false,
      code: 'APP_WORKER_NOT_FOUND',
      message: args.message,
      stack: args.stack,
      details: args.details,
    })
  }
}

export class UnknownAsyncWorkError extends AsyncWorkError {
  constructor(
    args: NullablePartial<
      Omit<
        AsyncWorkErrorConstructorArg,
        'retry' | 'class' | 'code' | 'retryDelaySeconds'
      >,
      'origin'
    >,
  ) {
    super({
      ...args,
      origin: args.origin ?? 'app',
      class: 'permanent',
      retry: false,
      code:
        args.origin === 'app' ? 'UNKNOWN_APP_ERROR' : 'UNKNOWN_INTERNAL_ERROR',
      message: args.message,
      stack: args.stack,
      details: args.details,
    })
  }
}
