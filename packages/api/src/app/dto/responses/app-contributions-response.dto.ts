import { createZodDto } from '@anatine/zod-nestjs'
import { appContributionsSchema } from '@stellariscloud/types'
import { z } from 'zod'

export const appContributionsResponseSchema = z.record(
  z.string(),
  z.object({
    appLabel: z.string(),
    appIdentifier: z.string(),
    contributions: appContributionsSchema,
  }),
)

export class AppContributionsResponse extends createZodDto(
  appContributionsResponseSchema,
) {}
