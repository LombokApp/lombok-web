import type { ScheduleConfig, ScheduleUnit } from '@lombokapp/types'

const UNIT_SECONDS: Record<ScheduleUnit, number> = {
  minutes: 60,
  hours: 60 * 60,
  days: 24 * 60 * 60,
}

export function getUtcScheduleBucket(
  schedule: ScheduleConfig,
  at: Date,
): {
  bucketIndex: number
  bucketStart: Date
} {
  if (schedule.interval <= 0) {
    throw new Error('interval must be > 0')
  }

  const periodSeconds = schedule.interval * UNIT_SECONDS[schedule.unit]

  const epochSeconds = Math.floor(at.getTime() / 1000)

  const bucketIndex = Math.floor(epochSeconds / periodSeconds)
  const bucketStartSeconds = bucketIndex * periodSeconds

  return {
    bucketIndex,
    bucketStart: new Date(bucketStartSeconds * 1000),
  }
}
