import type { ScheduleConfig } from '@lombokapp/types'
import { getUtcTimestampBucket } from 'src/shared/utils/timestamp.util'

export function getUtcScheduleBucket(
  schedule: ScheduleConfig,
  at: Date,
): {
  bucketIndex: number
  bucketStart: Date
} {
  return getUtcTimestampBucket(schedule.interval, schedule.unit, at)
}
