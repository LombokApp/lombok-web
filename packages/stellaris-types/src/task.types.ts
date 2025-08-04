import { z } from 'zod'

export interface TaskInputData {
  [key: string]: string | number | TaskInputData
}

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
