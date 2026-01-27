import { z } from 'zod'
import { readFileSync } from 'fs'
import { resolve } from 'path'

// Job payload interface types
const jobInterfaceSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('persistent_http'),
    port: z.number(),
  }),
  z.object({
    kind: z.literal('exec_per_job'),
  }),
])

const jobPayloadSchema = z.object({
  job_id: z.string().optional(), // Auto-generated if not provided
  job_class: z.string(),
  wait_for_completion: z.boolean().optional().default(true),
  worker_command: z.array(z.string()),
  interface: jobInterfaceSchema,
  job_input: z.record(z.any()).optional(),
  job_token: z.string().optional(),
  platform_url: z.string().optional(),
  output_location: z
    .object({
      folder_id: z.string(),
      prefix: z.string().optional(),
      objectKey: z.string().optional(),
    })
    .optional(),
  job_output_dir: z.string().optional(),
})

const jobValidationSchema = z
  .object({
    custom: z.string().optional(), // Path to custom validation function (can use Zod schemas)
  })
  .optional()

const jobConfigSchema = z.object({
  id: z.string(), // Optional identifier for filtering
  payload: jobPayloadSchema,
  validate: jobValidationSchema,
})

// Build configuration
const buildConfigSchema = z
  .object({
    ssh: z.string().optional(), // SSH host for remote build (e.g., "user@host")
    noCache: z.boolean().optional().default(false),
    registry: z
      .object({
        url: z.string(),
        username: z.string().optional(),
        password: z.string().optional(),
        push: z.boolean().optional().default(false),
      })
      .optional(),
  })
  .optional()

// Container configuration
const containerConfigSchema = z.object({
  dockerHost: z.string().optional(), // Default: local docker socket
  name: z.string().optional(), // Auto-generated if not provided
  environmentVariables: z.record(z.string(), z.string()).optional(),
  volumes: z.array(z.string()).optional(), // Docker volume mounts
  gpus: z
    .object({
      driver: z.string(),
      deviceIds: z.array(z.string()),
    })
    .optional(),
  networkMode: z
    .union([
      z.literal('host'),
      z.literal('bridge'),
      z.string().regex(/^container:/),
    ])
    .optional(),
  extraHosts: z.array(z.string()).optional(),
})

// Mock server configuration
const mockServerConfigSchema = z
  .object({
    platformPort: z.number().optional().default(3002),
    fileServerPort: z.number().optional().default(3003),
    fileServerRoot: z.string().optional(), // Directory to serve files from (relative to config file or absolute). Defaults to <config_dir>/mocks/file-server-content if not provided.
  })
  .optional()

// Main test configuration
export const testConfigSchema = z.object({
  // Docker image configuration
  dockerfile: z.string(),
  buildContext: z.string().optional(), // Default: directory containing dockerfile
  imageName: z.string(),
  buildArgs: z.record(z.string(), z.string()).optional(),
  agentBinaryVariant: z.string().optional().default('linux-amd64'), // e.g., "linux-amd64", "linux-arm64", etc.

  // Build options
  build: buildConfigSchema,

  // Container deployment
  container: containerConfigSchema,

  // Live container logs
  liveLogs: z.boolean().optional().default(false),

  // Job payloads to test
  jobs: z.array(jobConfigSchema).min(1),

  // Mock server configuration
  mockServer: mockServerConfigSchema,
})

export type TestConfig = z.infer<typeof testConfigSchema>
export type JobConfig = z.infer<typeof jobConfigSchema>
export type JobPayload = z.infer<typeof jobPayloadSchema>
export type ContainerConfig = z.infer<typeof containerConfigSchema>
export type BuildConfig = z.infer<typeof buildConfigSchema>

/**
 * Load and validate a test configuration file
 */
export function loadConfig(configPath: string): TestConfig {
  const resolvedPath = resolve(configPath)
  const configContent = readFileSync(resolvedPath, 'utf-8')
  const configJson = JSON.parse(configContent)

  // Validate with Zod
  const result = testConfigSchema.safeParse(configJson)

  if (!result.success) {
    throw new Error(
      `Invalid configuration file: ${result.error.errors
        .map((e) => `${e.path.join('.')}: ${e.message}`)
        .join(', ')}`,
    )
  }

  return result.data
}

/**
 * Merge CLI flags into config
 */
export function mergeConfigFlags(
  config: TestConfig,
  flags: {
    dockerHost?: string
    jobIds?: string[]
    buildOnly?: boolean
    noCleanup?: boolean
    verbose?: boolean
    liveLogs?: boolean
    noCache?: boolean
  },
): TestConfig {
  const merged = { ...config }

  if (flags.dockerHost) {
    merged.container = { ...merged.container, dockerHost: flags.dockerHost }
  }

  if (flags.jobIds && flags.jobIds.length > 0) {
    merged.jobs = merged.jobs.filter((job) => {
      if (!job.id) {
        return false
      }
      return flags.jobIds!.includes(job.id)
    })

    if (merged.jobs.length === 0) {
      throw new Error(`No jobs found matching IDs: ${flags.jobIds.join(', ')}`)
    }
  }

  if (typeof flags.liveLogs === 'boolean') {
    merged.liveLogs = flags.liveLogs
  }

  if (typeof flags.noCache === 'boolean') {
    merged.build = {
      ...(merged.build || {}),
      noCache: flags.noCache,
    }
  }
  return merged
}
