/**
 * Structured logger used inside the worker daemon (nsjail'd process).
 *
 * Emits single-line JSON to process.stdout. The host (api CoreWorkerService)
 * line-splits the child's stdout and, when it detects lines of this shape,
 * routes them to the NestJS logger at the matching level. Non-JSON lines
 * are treated as legacy raw output.
 *
 * Configured via env:
 *   LOMBOK_WORKER_LOG="daemon=info,ipc=warn,timing=off,http=info,task=info,user=debug"
 *   LOMBOK_WORKER_LOG_PRETTY=1  (render plain-text lines instead of JSON)
 */

export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error'
export type LogChannel = 'daemon' | 'ipc' | 'timing' | 'http' | 'task' | 'user'

const LEVEL_WEIGHT: Record<LogLevel | 'off', number> = {
  off: 100,
  error: 50,
  warn: 40,
  info: 30,
  debug: 20,
  trace: 10,
}

const DEFAULT_LEVELS: Record<LogChannel, LogLevel | 'off'> = {
  daemon: 'info',
  ipc: 'warn',
  timing: 'off',
  http: 'info',
  task: 'info',
  user: 'debug',
}

function parseLevels(
  spec: string | undefined,
): Record<LogChannel, LogLevel | 'off'> {
  const levels = { ...DEFAULT_LEVELS }
  if (!spec) {
    return levels
  }
  for (const part of spec.split(',')) {
    const [rawCh, rawLv] = part.split('=')
    const ch = rawCh?.trim() as LogChannel | undefined
    const lv = rawLv?.trim() as LogLevel | 'off' | undefined
    if (!ch || !lv) {
      continue
    }
    if (!(ch in DEFAULT_LEVELS)) {
      continue
    }
    if (!(lv in LEVEL_WEIGHT)) {
      continue
    }
    levels[ch] = lv
  }
  return levels
}

const activeLevels = parseLevels(process.env.LOMBOK_WORKER_LOG)
const prettyMode =
  process.env.LOMBOK_WORKER_LOG_PRETTY === '1' ||
  process.env.LOMBOK_WORKER_LOG_PRETTY === 'true'

export interface LogContext {
  app?: string
  worker?: string
  reqId?: string
  executionId?: string
}

let baseContext: LogContext = {}
export function setBaseLogContext(ctx: LogContext): void {
  baseContext = { ...baseContext, ...ctx }
}

function enabled(channel: LogChannel, level: LogLevel): boolean {
  const configured = activeLevels[channel]
  return LEVEL_WEIGHT[level] >= LEVEL_WEIGHT[configured]
}

export function channelLevel(channel: LogChannel): LogLevel | 'off' {
  return activeLevels[channel]
}

function emit(
  level: LogLevel,
  channel: LogChannel,
  msg: string,
  data: Record<string, unknown> | undefined,
): void {
  if (!enabled(channel, level)) {
    return
  }
  const record: Record<string, unknown> = {
    t: new Date().toISOString(),
    lvl: level,
    ch: channel,
    ...baseContext,
    msg,
  }
  if (data && Object.keys(data).length > 0) {
    record.data = data
  }
  try {
    if (prettyMode) {
      const tag = `[${level.toUpperCase()}][${channel}]`
      const ctx = baseContext.worker
        ? ` [${baseContext.app}/${baseContext.worker}]`
        : ''
      const rid = baseContext.reqId
        ? ` (${baseContext.reqId.slice(0, 12)})`
        : ''
      const extra = data ? ' ' + JSON.stringify(data) : ''
      process.stdout.write(`${tag}${ctx}${rid} ${msg}${extra}\n`)
    } else {
      process.stdout.write('LOMBOK_LOG ' + JSON.stringify(record) + '\n')
    }
  } catch {
    // ignore write errors
  }
}

export const workerLogger = {
  trace: (ch: LogChannel, msg: string, data?: Record<string, unknown>) =>
    emit('trace', ch, msg, data),
  debug: (ch: LogChannel, msg: string, data?: Record<string, unknown>) =>
    emit('debug', ch, msg, data),
  info: (ch: LogChannel, msg: string, data?: Record<string, unknown>) =>
    emit('info', ch, msg, data),
  warn: (ch: LogChannel, msg: string, data?: Record<string, unknown>) =>
    emit('warn', ch, msg, data),
  error: (ch: LogChannel, msg: string, data?: Record<string, unknown>) =>
    emit('error', ch, msg, data),
  enabled,
  channelLevel,
}

export const WORKER_LOG_JSON_PREFIX = 'LOMBOK_LOG '
