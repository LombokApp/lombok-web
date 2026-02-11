import { jsonSerializableObjectSchema, requeueSchema } from '@lombokapp/types'
import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

export const outputFilesSchema = z.object({
  outputFiles: z
    .array(
      z.object({
        folderId: z.guid(),
        objectKey: z.string().min(1),
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
  .extend(outputFilesSchema.shape)

export const successResponseSchema = z
  .object({
    success: z.literal(true),
    result: jsonSerializableObjectSchema,
  })
  .extend(outputFilesSchema.shape)

export const dockerJobResultSchema = z.discriminatedUnion('success', [
  successResponseSchema,
  errorResponseSchema,
])

// @ts-expect-error - Discriminated union causes TypeScript error with class extension in Zod v4
export class DockerJobCompleteRequestDTO extends createZodDto(
  dockerJobResultSchema,
) {}

export type DiscriminatedDockerJobCompleteRequestDTO = z.infer<
  typeof dockerJobResultSchema
>
