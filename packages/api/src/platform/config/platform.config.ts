import { registerAs } from '@nestjs/config'
import { z } from 'zod'

import { isBoolean, isInteger, parseEnv } from '../utils/config.util'
import { isValidDockerHostPathOrHttp } from './docker-host.validator'

// const _conf = {
//   homelab: {
//     type: 'docker_endpoint'
//     host: 'http://10.1.3.20:2375',
//     gpus: {
//       'app:content_indexing': {
//         driver: 'nvidia',
//         deviceIds: ['0'],
//       },
//     },
//     volumes: {
//       'app:content_indexing': {
//         '/app/model_cache':
//           '/mnt/user/appdata/app__content_indexing__model-cache',
//       },
//     },
//     environmentVariables: {
//       'app:content_indexing': {
//         // PRIVATE_KEY: '___',
//       },
//     },
//   },
//   local: {
//     host: 'http://127.0.0.1:2375',
//   },
// }

// DOCKER_HOST_CONFIG={"homelab":{"host":"http://10.1.3.20:2375","gpus":{"app:content_indexing":{"driver":"nvidia","deviceIds":["0"]}},"volumes":{"app:content_indexing":{"/app/model_cache":"/mnt/user/appdata/app__content_indexing__model-cache"}}},"local":{"host":"http://127.0.0.1:2375"}}
export const dockerHostConfigSchema = z
  .record(
    z.string(),
    z
      .object({
        host: z.string(), // the docker host endpoint (http or socket path)
        type: z.enum(['docker_endpoint']),
        gpus: z
          .record(
            z.string(),
            z.object({ driver: z.string(), deviceIds: z.array(z.string()) }),
          )
          .optional(), // the specific GPUs assigned to app container profiles. e.g. {'app:content_indexing': "\"device=0'""}
        volumes: z
          .record(z.string(), z.record(z.string(), z.string()))
          .optional(), // the volumes assigned to app container profiles. e.g. {'app:content_indexing': ["/app/model_cache:/mnt/user/appdata/model-cache"]}
      })
      .strict(),
  )
  .optional()

export type DockerHostConfig = z.infer<typeof dockerHostConfigSchema>

export const platformConfig = registerAs('platform', () => {
  const env = parseEnv({
    DOCKER_HOST_CONFIG: z
      .string()
      .transform((val) => dockerHostConfigSchema.parse(JSON.parse(val)))
      .refine(
        (val) =>
          val !== undefined &&
          Object.keys(val).every((key) =>
            isValidDockerHostPathOrHttp(val[key].host),
          ),
        {
          message: 'DOCKER_HOST_CONFIG must be a valid JSON object',
        },
      )
      .optional(),
    INSTALL_APPS_ON_START: z.string().refine(isBoolean).optional(),
    PLATFORM_HOST: z.string(),
    PLATFORM_PORT: z.string().refine(isInteger).optional(),
    PLATFORM_HTTPS: z.literal('false').or(z.literal('0')).optional(),
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
    dockerHostConfig: env.DOCKER_HOST_CONFIG ?? {},
    installAppsOnStart: !!(
      env.INSTALL_APPS_ON_START === '1' || env.INSTALL_APPS_ON_START === 'true'
    ),
    platformHost: env.PLATFORM_HOST,
    platformHttps: env.PLATFORM_HTTPS !== 'false' && env.PLATFORM_HTTPS !== '0',
    platformPort: env.PLATFORM_PORT ? parseInt(env.PLATFORM_PORT, 10) : null,
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
