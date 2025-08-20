import type { LogLevel } from '@nestjs/common'
import { ConsoleLogger } from '@nestjs/common'

export class NoPrefixConsoleLogger extends ConsoleLogger {
  protected override formatMessage(
    logLevel: LogLevel,
    message: unknown,
    _pidMessage: string,
    formattedLogLevel: string,
    contextMessage: string,
    _timestampDiff: string,
  ): string {
    const output: unknown = this.stringifyMessage(message, logLevel)
    const _formattedLogLevel: string = this.colorize(
      formattedLogLevel,
      logLevel,
    )
    return `${this.getTimestamp()} ${_formattedLogLevel}${contextMessage}${String(output)}\n`
  }
}
