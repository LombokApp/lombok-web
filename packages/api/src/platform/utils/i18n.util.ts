import type { TOptions } from 'i18next'
import i18next from 'i18next'
import util from 'util'

export const formatErrorCode = (code: string, options?: TOptions) => ({
  code,
  title: i18next.t(`errors:${code}.title`, '', options) || undefined,
  detail: i18next.t(`errors:${code}.detail`, '', options) || undefined,
})

const LOG_MAX_LINES = 20

export const stringifyLog = (value: unknown): string => {
  const message = Array.isArray(value)
    ? value
        .map((v) =>
          typeof v === 'string' ? v : '\n' + util.inspect(v, { colors: true }),
        )
        .join(' ')
    : util.inspect(value, { colors: true })

  const lines = message.split('\n')

  if (lines.length <= LOG_MAX_LINES) {
    return message
  }

  return lines
    .slice(0, LOG_MAX_LINES - 2)
    .concat('  ...', lines.slice(-1))
    .join('\n')
}
