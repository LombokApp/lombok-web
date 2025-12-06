import type { JsonSerializableObject } from '@lombokapp/types'

export class WorkerError extends Error {
  constructor(
    message: string,
    public readonly innerError?: unknown,
  ) {
    super(message)
  }
}

export class WorkerRuntimeError extends WorkerError {}
export class WorkerInvalidError extends WorkerError {}
export class WorkerExecutorError extends WorkerError {}
export interface SerializeableError {
  className: string
  name: string
  message: string
  stack?: string
  innerError?: SerializeableError
}

export function serializeWorkerError(err: unknown): string {
  if (!(err instanceof Error)) {
    return serializeWorkerError(err)
  }
  const serializeableError: SerializeableError = {
    className: err.constructor.name,
    name: err.name,
    message: err.message,
    stack: err.stack,
    innerError:
      err instanceof WorkerError && err.innerError
        ? (JSON.parse(
            serializeWorkerError(err.innerError),
          ) as SerializeableError)
        : undefined,
  }
  return JSON.stringify(serializeableError)
}

export class ScriptExecutionError extends Error {
  constructor(
    message: string,
    public readonly details: Record<string, unknown>,
  ) {
    super(message)
  }
}

export class WorkerScriptRuntimeError extends Error {
  constructor(
    message: string,
    public readonly details: JsonSerializableObject,
  ) {
    super(message)
  }
}
