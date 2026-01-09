import { createZodDto } from '@anatine/zod-nestjs'
import { jsonSerializableObjectSchema, requeueSchema } from '@lombokapp/types'
import { z } from 'zod'

export const outputFilesSchema = z.object({
  outputFiles: z
    .array(
      z.object({
        folderId: z.string().uuid(),
        objectKey: z.string().nonempty(),
      }),
    )
    .optional(),
})

export const errorResponseSchema = z
  .object({
    success: z.literal(false),
    error: z.object({
      requeueDelayMs: requeueSchema.optional(),
      name: z.string().optional(),
      code: z.string(),
      message: z.string(),
      details: jsonSerializableObjectSchema.optional(),
    }),
  })
  .merge(outputFilesSchema)

export const successResponseSchema = z
  .object({
    success: z.literal(true),
    result: jsonSerializableObjectSchema,
  })
  .merge(outputFilesSchema)

export const dockerJobResultSchema = z.discriminatedUnion('success', [
  successResponseSchema,
  errorResponseSchema,
])

export class WorkerJobCompleteRequestDTO extends createZodDto(
  dockerJobResultSchema,
) {}

export type DiscriminatedWorkerJobCompleteRequestDTO = z.infer<
  typeof dockerJobResultSchema
>
