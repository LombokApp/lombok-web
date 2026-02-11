import { appContributionsSchema } from '@lombokapp/types'
import { createZodDto } from 'nestjs-zod'
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
