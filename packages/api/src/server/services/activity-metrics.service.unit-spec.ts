import { describe, expect, it } from 'bun:test'

import {
  enumerateBuckets,
  floorToBucket,
  shapeSeries,
} from './activity-metrics.service'

describe('ActivityMetricsService helpers', () => {
  describe('floorToBucket', () => {
    it('floors to the UTC hour', () => {
      const result = floorToBucket(new Date('2026-06-13T14:37:42.123Z'), 'hour')
      expect(result.toISOString()).toBe('2026-06-13T14:00:00.000Z')
    })

    it('floors to the UTC day', () => {
      const result = floorToBucket(new Date('2026-06-13T14:37:42.123Z'), 'day')
      expect(result.toISOString()).toBe('2026-06-13T00:00:00.000Z')
    })
  })

  describe('enumerateBuckets', () => {
    it('produces a continuous, inclusive hourly range', () => {
      const buckets = enumerateBuckets(
        new Date('2026-06-13T10:00:00Z'),
        new Date('2026-06-13T13:00:00Z'),
        'hour',
      )
      expect(buckets).toEqual([
        '2026-06-13T10:00:00Z',
        '2026-06-13T11:00:00Z',
        '2026-06-13T12:00:00Z',
        '2026-06-13T13:00:00Z',
      ])
    })

    it('produces daily buckets formatted at midnight', () => {
      const buckets = enumerateBuckets(
        new Date('2026-06-11T00:00:00Z'),
        new Date('2026-06-13T00:00:00Z'),
        'day',
      )
      expect(buckets).toEqual([
        '2026-06-11T00:00:00Z',
        '2026-06-12T00:00:00Z',
        '2026-06-13T00:00:00Z',
      ])
    })
  })

  describe('shapeSeries', () => {
    const buckets = ['2026-06-13T10:00:00Z', '2026-06-13T11:00:00Z']

    it('zero-fills missing buckets per dimension', () => {
      const series = shapeSeries(
        [{ bucket: '2026-06-13T11:00:00Z', dim: 'core', value: 5 }],
        buckets,
        'app',
      )
      expect(series).toEqual([
        {
          key: 'core',
          label: 'core',
          points: [
            { bucket: '2026-06-13T10:00:00Z', value: 0 },
            { bucket: '2026-06-13T11:00:00Z', value: 5 },
          ],
        },
      ])
    })

    it('splits rows into one series per dimension, sorted by key', () => {
      const series = shapeSeries(
        [
          { bucket: '2026-06-13T10:00:00Z', dim: 'task_failed', value: 2 },
          { bucket: '2026-06-13T10:00:00Z', dim: 'task_completed', value: 7 },
        ],
        buckets,
        'type',
      )
      expect(series.map((s) => s.key)).toEqual([
        'task_completed',
        'task_failed',
      ])
      expect(series[0]?.points[0]).toEqual({
        bucket: '2026-06-13T10:00:00Z',
        value: 7,
      })
    })

    it('returns a single zero-filled "all" series when ungrouped and empty', () => {
      const series = shapeSeries([], buckets, 'none')
      expect(series).toEqual([
        {
          key: 'all',
          label: 'all',
          points: [
            { bucket: '2026-06-13T10:00:00Z', value: 0 },
            { bucket: '2026-06-13T11:00:00Z', value: 0 },
          ],
        },
      ])
    })
  })
})
