export interface Logger {
  info: (msg: string, fields?: Record<string, unknown>) => void
  warn: (msg: string, fields?: Record<string, unknown>) => void
  error: (msg: string, fields?: Record<string, unknown>) => void
  debug: (msg: string, fields?: Record<string, unknown>) => void
}

const LOG_LEVELS: Record<string, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
}

export function createLogger(config: { level: string }): Logger {
  const threshold = LOG_LEVELS[config.level] ?? LOG_LEVELS.info

  function log(
    level: string,
    msg: string,
    fields?: Record<string, unknown>,
  ): void {
    if ((LOG_LEVELS[level] ?? 0) < threshold) {
      return
    }

    const entry = {
      level,
      ts: new Date().toISOString(),
      msg,
      ...fields,
    }
    process.stdout.write(JSON.stringify(entry) + '\n')
  }

  return {
    info: (msg, fields?) => log('info', msg, fields),
    warn: (msg, fields?) => log('warn', msg, fields),
    error: (msg, fields?) => log('error', msg, fields),
    debug: (msg, fields?) => log('debug', msg, fields),
  }
}
