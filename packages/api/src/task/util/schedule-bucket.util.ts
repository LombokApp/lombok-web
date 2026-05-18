import type { ScheduleConfig } from '@lombokapp/types'
import { CronExpressionParser } from 'cron-parser'
import { getUtcTimestampBucket } from 'src/shared/utils/timestamp.util'

export function getUtcScheduleBucket(
  schedule: ScheduleConfig,
  at: Date,
): {
  bucketStart: Date
} {
  if (schedule.kind === 'interval') {
    return getUtcTimestampBucket(schedule.interval, schedule.unit, at)
  }
  // cron: prev fire time at or before `at`, in the schedule's timezone.
  // cron-parser semantics: prev() returns the most recent fire strictly before
  // currentDate, so we pass currentDate one millisecond past `at` to include a
  // fire scheduled exactly at `at`.
  const parsed = CronExpressionParser.parse(schedule.expression, {
    currentDate: new Date(at.getTime() + 1),
    tz: schedule.timezone ?? 'UTC',
  })
  const bucketStart = parsed.prev().toDate()
  // Truncate to the start of the minute. Cron is minute-granular; without
  // truncation, idempotency-bucket strings could vary by milliseconds.
  bucketStart.setUTCSeconds(0, 0)
  return { bucketStart }
}
