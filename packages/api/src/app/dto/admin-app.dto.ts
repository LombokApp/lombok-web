import {
  appConfigSchema,
  appContributionsSchema,
  appManifestSchema,
  appMetricsSchema,
  appRuntimeWorkersBundleSchema,
  appRuntimeWorkerSocketConnectionSchema,
  appSystemRequestRuntimeWorkersSchema,
  appUiBundleSchema,
} from '@lombokapp/types'
import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

export const adminAppDTOSchema = z
  .object({
    id: z.string(),
    identifier: z.string(),
    slug: z.string(),
    label: z.string(),
    config: appConfigSchema,
    requiresStorage: z.boolean(),
    enabled: z.boolean(),
    userScopeEnabledDefault: z.boolean(),
    folderScopeEnabledDefault: z.boolean(),
    manifest: appManifestSchema,
    systemRequestRuntimeWorkers: appSystemRequestRuntimeWorkersSchema,
    connectedRuntimeWorkers: z.array(appRuntimeWorkerSocketConnectionSchema),
    runtimeWorkers: appRuntimeWorkersBundleSchema,
    ui: appUiBundleSchema.nullable(),
    contributions: appContributionsSchema,
    metrics: appMetricsSchema.nullable(),
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
  })
  .meta({ id: 'AdminApp' })

export class AdminAppDTO extends createZodDto(adminAppDTOSchema) {}
