import { createZodDto } from '@anatine/zod-nestjs'
import { jsonSerializableObjectSchema } from '@lombokapp/types'
import { z } from 'zod'

export const uploadedFilesSchema = z.object({
  uploadedFiles: z
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
      code: z.string(),
      message: z.string(),
    }),
  })
  .merge(uploadedFilesSchema)

export const successResponseSchema = z
  .object({
    success: z.literal(true),
    result: jsonSerializableObjectSchema,
  })
  .merge(uploadedFilesSchema)

const resultSchema = z.discriminatedUnion('success', [
  successResponseSchema,
  errorResponseSchema,
])

export class WorkerJobCompleteRequestDTO extends createZodDto(resultSchema) {}

export type DiscriminatedWorkerJobCompleteRequestDTO = z.infer<
  typeof resultSchema
>
