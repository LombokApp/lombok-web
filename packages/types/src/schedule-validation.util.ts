import { CronExpressionParser } from 'cron-parser'

// Reject 6-field expressions (seconds). The platform's schedule polling cadence
// is 1 minute, so sub-minute granularity would over-promise.
export function isValidCronExpression(expression: string): boolean {
  const fields = expression.trim().split(/\s+/)
  if (fields.length !== 5) {
    return false
  }
  try {
    CronExpressionParser.parse(expression)
    return true
  } catch {
    return false
  }
}

export function isValidIanaTimezone(timezone: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: timezone })
    return true
  } catch {
    return false
  }
}
