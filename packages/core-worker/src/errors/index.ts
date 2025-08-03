export class WorkerError extends Error {
  constructor(
    message: string,
    public readonly innerError?: Error,
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
  cause?: string | unknown
  innerError?: SerializeableError
}

export function serializeError(err: WorkerError | Error): string {
  const serializeableError: SerializeableError = {
    className: err.constructor.name,
    name: err.name,
    message: err.message,
    stack: err.stack,
    cause: err.cause,
    innerError:
      err instanceof WorkerError && err.innerError
        ? JSON.parse(serializeError(err.innerError))
        : undefined,
  }
  return JSON.stringify(serializeableError)
}
