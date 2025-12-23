import { z } from 'zod'

import type { JsonSerializableValue } from './apps.types'

export type TaskInputData = JsonSerializableValue

export interface WorkerErrorDetails {
  [key: string]: string | number | WorkerErrorDetails
}

export const taskInputDataSchema: z.ZodType<TaskInputData> = z.lazy(() =>
  z.record(z.string(), z.union([z.string(), z.number(), taskInputDataSchema])),
)

export const workerErrorDetailsSchema: z.ZodType<WorkerErrorDetails> = z.lazy(
  () =>
    z.record(
      z.string(),
      z.union([z.string(), z.number(), workerErrorDetailsSchema]),
    ),
)
