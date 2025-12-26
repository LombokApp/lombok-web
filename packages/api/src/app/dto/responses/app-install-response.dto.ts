import { createZodDto } from '@anatine/zod-nestjs'
import { z } from 'zod'

import { adminAppDTOSchema } from '../admin-app.dto'

export const appInstallResponseSchema = z.object({
  app: adminAppDTOSchema,
})

export class AppInstallResponse extends createZodDto(
  appInstallResponseSchema,
) {}
