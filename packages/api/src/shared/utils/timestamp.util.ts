export type IntervalUnit = 'minutes' | 'hours' | 'days' | 'seconds'

export const UNIT_SECONDS: Record<IntervalUnit, number> = {
  minutes: 60,
  hours: 60 * 60,
  days: 24 * 60 * 60,
  seconds: 1,
}

export function getUtcTimestampBucket(
  interval: number,
  unit: IntervalUnit,
  at: Date,
): {
  bucketIndex: number
  bucketStart: Date
} {
  if (interval <= 0) {
    throw new Error('interval must be > 0')
  }

  const periodSeconds = interval * UNIT_SECONDS[unit]

  const epochSeconds = Math.floor(at.getTime() / 1000)

  const bucketIndex = Math.floor(epochSeconds / periodSeconds)
  const bucketStartSeconds = bucketIndex * periodSeconds

  return {
    bucketIndex,
    bucketStart: new Date(bucketStartSeconds * 1000),
  }
}
