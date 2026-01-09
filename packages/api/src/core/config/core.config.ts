import {
  appIdentifierSchema,
  appProfileIdentifierSchema,
} from '@lombokapp/types'
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
//       'app:content_indexing': ["/app/model_cache:/mnt/user/appdata/app__content_indexing__model-cache"],
//     },
//     extraHosts: {
//       'app:content_indexing': ["host-name:10.1.3.20"],
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

const appAndProfileIdentifierSchema = z
  .string()
  .regex(/^[a-z_:]+$/)
  .refine(
    (v) =>
      v === 'default' ||
      (appIdentifierSchema.safeParse(v.split(':')[0]).success &&
        appProfileIdentifierSchema.safeParse(v.split(':')[1]).success),
    {
      message: 'App profile identifier must be lowercase',
    },
  )

export const dockerHostConfigSchema = z
  .object({
    hosts: z
      .record(
        z.string(),
        z
          .object({
            host: z.string(), // the docker host endpoint (http or socket path)
            type: z.enum(['docker_endpoint']),
            extraHosts: z.record(z.string(), z.string().array()).optional(), // the extra hosts assigned to app container profiles. e.g. {'app:content_indexing': ["host-name:10.1.3.20"]}
            networkMode: z
              .record(
                z.string(),
                z
                  .literal('host')
                  .or(z.literal('bridge'))
                  .or(
                    z.string().startsWith('container:') as z.ZodType<
                      `container:${string}`,
                      z.ZodStringDef,
                      string
                    >,
                  ),
              )
              .optional(),
            gpus: z
              .record(
                z.string(),
                z.object({
                  driver: z.string(),
                  deviceIds: z.array(z.string()),
                }),
              )
              .optional(), // the specific GPUs assigned to app container profiles. e.g. {'app:content_indexing': "\"device=0'""}
            volumes: z.record(z.string(), z.string().array()).optional(), // the volumes assigned to app container profiles. e.g. {'app:content_indexing': ["/app/model_cache:/mnt/user/appdata/model-cache"]}
          })
          .strict(),
      )
      .optional(),
    profileHostAssignments: z
      .record(appAndProfileIdentifierSchema, z.string())
      .optional(),
  })
  .strict()
  .optional()

export type DockerHostConfig = z.infer<typeof dockerHostConfigSchema>

export const coreConfig = registerAs('core', () => {
  const env = parseEnv({
    DOCKER_HOST_CONFIG: z
      .string()
      .transform((val) => dockerHostConfigSchema.parse(JSON.parse(val)))
      .refine(
        (val) =>
          val !== undefined &&
          Object.keys(val.hosts ?? {}).every((key) =>
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            isValidDockerHostPathOrHttp(val.hosts![key]!.host),
          ),
        {
          message: 'DOCKER_HOST_CONFIG must be a valid JSON object',
        },
      )
      .optional(),
    PLATFORM_HOST: z.string(),
    PLATFORM_PORT: z.string().refine(isInteger).optional(),
    PLATFORM_HTTPS: z.literal('false').or(z.literal('0')).optional(),
    INITIAL_USER: z.string().optional(),
    DISABLE_CORE_WORKER: z.string().refine(isBoolean).optional(),
    INIT_EVENT_JOBS: z.string().refine(isBoolean).optional(),
    PRINT_CORE_WORKER_OUTPUT: z.string().refine(isBoolean).optional(),
    REMOVE_CORE_WORKER_DIRECTORIES: z.string().refine(isBoolean).optional(),
    PRINT_CORE_WORKER_NSJAIL_VERBOSE_OUTPUT: z
      .string()
      .refine(isBoolean)
      .optional(),
  })

  return {
    dockerHostConfig: env.DOCKER_HOST_CONFIG ?? {},
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
