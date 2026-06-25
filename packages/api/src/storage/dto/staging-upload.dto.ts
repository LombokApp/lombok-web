import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

import { STAGING_PURPOSES } from '../staging-upload.constants'

// A reference to a staged upload the client created via POST /staging-uploads.
export const stagingKeySchema = z.uuid()

export const stagingPurposeSchema = z.enum(STAGING_PURPOSES)

export const stagingUploadInputSchema = z.object({
  purpose: stagingPurposeSchema,
})

export class StagingUploadInputDTO extends createZodDto(
  stagingUploadInputSchema,
) {}

export const stagingUploadResponseSchema = z.object({
  stagingKey: z.string(),
  uploadUrl: z.string(),
})

export class StagingUploadResponse extends createZodDto(
  stagingUploadResponseSchema,
) {}

export const stagingKeyInputSchema = z.object({
  stagingKey: stagingKeySchema,
})

export class StagingKeyInputDTO extends createZodDto(stagingKeyInputSchema) {}
