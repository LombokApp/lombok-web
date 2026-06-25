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
      CORE_WORKER_LOG_CHANNELS: z.string().optional(),
      CORE_WORKER_LOG_PRETTY: z.string().refine(isBoolean).optional(),
      BRIDGE_TUNNEL_DOMAIN: z.string().optional(),
      // Fixed-name system buckets in the embedded S3 service. The e2e harness
      // overrides these (via the coreConfig DI provider) to namespace per suite.
      S3_SERVER_STORAGE_BUCKET: z.string().default('server-storage'),
      S3_PROVISIONS_BUCKET: z.string().default('provisions'),
      // MUST stay 'uploads' in production: nginx.conf hardcodes ^/uploads/{tier}/
      // per-tier client_max_body_size caps for staged uploads. Changing it would
      // drop those edge caps (requests fall through to the unlimited s3 default).
      // Only the e2e harness overrides this — it talks to S3/MinIO directly,
      // never through nginx.
      S3_UPLOADS_BUCKET: z.string().default('uploads'),
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
    coreWorkerLogChannels: env.CORE_WORKER_LOG_CHANNELS,
    coreWorkerLogPretty:
      env.CORE_WORKER_LOG_PRETTY === '1' ||
      env.CORE_WORKER_LOG_PRETTY === 'true',
    s3SystemBuckets: {
      serverStorage: env.S3_SERVER_STORAGE_BUCKET,
      provisions: env.S3_PROVISIONS_BUCKET,
      uploads: env.S3_UPLOADS_BUCKET,
    },
  }
})
