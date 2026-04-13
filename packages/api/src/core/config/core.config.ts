import { registerAs } from '@nestjs/config'
import { z } from 'zod'

import { isBoolean, isInteger, parseEnv } from '../utils/config.util'

export const coreConfig = registerAs('core', () => {
  const env = parseEnv(
    z.object({
      PLATFORM_HOST: z.string(),
      PLATFORM_PORT: z.string().refine(isInteger).optional(),
      PLATFORM_HTTPS: z.string().refine(isBoolean).default('true'),
      INITIAL_USER: z.string().optional(),
      DISABLE_CORE_WORKER: z.string().refine(isBoolean).optional(),
      INIT_EVENT_JOBS: z.string().refine(isBoolean).optional(),
      PRINT_CORE_WORKER_OUTPUT: z.string().refine(isBoolean).optional(),
      REMOVE_CORE_WORKER_DIRECTORIES: z.string().refine(isBoolean).optional(),
      PRINT_CORE_WORKER_NSJAIL_VERBOSE_OUTPUT: z
        .string()
        .refine(isBoolean)
        .optional(),
      BRIDGE_TUNNEL_DOMAIN: z.string().optional(),
    }),
  )

  return {
    platformHost: env.PLATFORM_HOST,
    platformHttps: env.PLATFORM_HTTPS !== 'false' && env.PLATFORM_HTTPS !== '0',
    platformPort: env.PLATFORM_PORT ? parseInt(env.PLATFORM_PORT, 10) : null,
    initialUser: env.INITIAL_USER,
    disableCoreWorker:
      env.DISABLE_CORE_WORKER === '1' || env.DISABLE_CORE_WORKER === 'true',
    printCoreWorkerOutput:
      env.PRINT_CORE_WORKER_OUTPUT === '1' ||
      env.PRINT_CORE_WORKER_OUTPUT === 'true',
    removeCoreWorkerDirectories:
      env.REMOVE_CORE_WORKER_DIRECTORIES !== '0' &&
      env.REMOVE_CORE_WORKER_DIRECTORIES !== 'false',
    printCoreWorkerNsjailVerboseOutput:
      env.PRINT_CORE_WORKER_NSJAIL_VERBOSE_OUTPUT === '1' ||
      env.PRINT_CORE_WORKER_NSJAIL_VERBOSE_OUTPUT === 'true',
  }
})
