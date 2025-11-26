import { registerAs } from '@nestjs/config'
import { z } from 'zod'

import { isBoolean, parseEnv } from '../utils/config.util'
import { isValidDockerHostPathOrHttp } from './docker-host.validator'

export const platformConfig = registerAs('platform', () => {
  const env = parseEnv({
    DOCKER_HOST: z
      .string()
      .refine(isValidDockerHostPathOrHttp, {
        message:
          'DOCKET_HOST must be a valid Docker host path (absolute Windows/Linux path) or an HTTP(S) endpoint (e.g. https://host:port).',
      })
      .optional(),
    INSTALL_APPS_ON_START: z.string().refine(isBoolean).optional(),
    PLATFORM_HOST: z.string(),
    INITIAL_USER: z.string().optional(),
    DISABLE_EMBEDDED_CORE_APP_WORKER: z.string().refine(isBoolean).optional(),
    INIT_EVENT_JOBS: z.string().refine(isBoolean).optional(),
    PRINT_EMBEDDED_CORE_APP_WORKER_OUTPUT: z
      .string()
      .refine(isBoolean)
      .optional(),
    REMOVE_EMBEDDED_CORE_APP_WORKER_DIRECTORIES: z
      .string()
      .refine(isBoolean)
      .optional(),
    PRINT_EMBEDDED_CORE_APP_NSJAIL_VERBOSE_OUTPUT: z
      .string()
      .refine(isBoolean)
      .optional(),
  })
  return {
    dockerHost: env.DOCKER_HOST,
    installAppsOnStart: !!(
      env.INSTALL_APPS_ON_START === '1' || env.INSTALL_APPS_ON_START === 'true'
    ),
    platformHost: env.PLATFORM_HOST,
    initialUser: env.INITIAL_USER,
    disableEmbeddedCoreAppWorker:
      env.DISABLE_EMBEDDED_CORE_APP_WORKER === '1' ||
      env.DISABLE_EMBEDDED_CORE_APP_WORKER === 'true',
    initEventJobs:
      env.INIT_EVENT_JOBS === '1' || env.INIT_EVENT_JOBS === 'true',
    printEmbeddedCoreAppWorkerOutput:
      env.PRINT_EMBEDDED_CORE_APP_WORKER_OUTPUT === '1' ||
      env.PRINT_EMBEDDED_CORE_APP_WORKER_OUTPUT === 'true',
    removeEmbeddedCoreAppWorkerDirectories:
      env.REMOVE_EMBEDDED_CORE_APP_WORKER_DIRECTORIES !== '0' &&
      env.REMOVE_EMBEDDED_CORE_APP_WORKER_DIRECTORIES !== 'false',
    printEmbeddedCoreAppNsjailVerboseOutput:
      env.PRINT_EMBEDDED_CORE_APP_NSJAIL_VERBOSE_OUTPUT === '1' ||
      env.PRINT_EMBEDDED_CORE_APP_NSJAIL_VERBOSE_OUTPUT === 'true',
  }
})
