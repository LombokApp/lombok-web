export function serializeError(err: unknown): string {
  if (!(err instanceof Error)) {
    return serializeError(new Error(String(err)))
  }
  return [
    '',
    `ERROR: "${err.constructor.name}"${err.name !== err.constructor.name ? ` "Class: ${err.constructor.name}"` : ''}`,
    `       ${err.stack?.split('\n').join('\n       ')}`,
    err.stack,
  ].join('\n')
}
