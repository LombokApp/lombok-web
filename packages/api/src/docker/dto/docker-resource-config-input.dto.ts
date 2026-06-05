import { z } from 'zod'

// ─── Mount schema
//
// Docker's Mount API declares every field on VolumeOptions, BindOptions,
// and TmpfsOptions as optional (each has a runtime default), which means
// `{}` is accepted by the API but does nothing. To keep our schema
// accurate to *effective* surface area (configs that actually change
// behaviour), each options object is modelled as a oneOf: at least one
// field must be present, so the empty-object shape is unrepresentable
// at both the type and runtime-validation layers.

const driverConfigSchema = z.object({
  // Name identifies the driver — a DriverConfig without it is meaningless,
  // so this is the one genuinely required field inside the options tree.
  name: z.string().nonempty(),
  options: z.record(z.string(), z.string()).optional(),
  // Lombok-managed: a path segment that must be created under the volume's
  // root before the real container starts, then appended to the driver's
  // `device` path. Not forwarded to Docker — the mount helper strips it
  // and rewrites `device` to `device + "/" + createSubpath`.
  createSubpath: z.string().nonempty().optional(),
})

// Each options object is a union of partial shapes, one per field, with
// that field promoted to required. Zod's `.required({ key: true })`
// preserves field-level types in the inferred output, so `z.infer`
// produces a properly-narrowed TS union where `{}` is unrepresentable.

const volumeOptionsSchema = z.object({
  noCopy: z.boolean().optional(),
  labels: z.record(z.string(), z.string()).optional(),
  driverConfig: driverConfigSchema,
  subpath: z.string().nonempty().optional(),
})

const bindOptionsSchema = z.object({
  propagation: z.enum([
    'private',
    'rprivate',
    'shared',
    'rshared',
    'slave',
    'rslave',
  ]),
  nonRecursive: z.boolean().optional(),
  createMountpoint: z.boolean().optional(),
  readOnlyNonRecursive: z.boolean().optional(),
  readOnlyForceRecursive: z.boolean().optional(),
})

const tmpfsOptionsSchema = z.object({
  sizeBytes: z.number().positive(),
  mode: z.number(),
  options: z.array(z.array(z.string())).nonempty().optional(),
})

// Fields common to every mount type. `source` lives on each variant
// because its nullability is type-dependent:
//   • volume — optional (omitted = anonymous volume, the NFS use case)
//   • bind   — required (must name a host path)
//   • tmpfs  — forbidden (no backing path; in-memory filesystem)
const mountBase = {
  target: z.string().nonempty(),
  readOnly: z.boolean().optional(),
}

export const mountSchema = z.discriminatedUnion('type', [
  z.object({
    ...mountBase,
    type: z.literal('volume'),
    source: z.string().nonempty().nullable(),
    volumeOptions: volumeOptionsSchema.optional(),
  }),
  z.object({
    ...mountBase,
    type: z.literal('bind'),
    source: z.string().nonempty(),
    bindOptions: bindOptionsSchema.optional(),
  }),
  // `z.never().optional()` → field must be undefined/absent; any value is
  // a parse error and the inferred type is `source?: undefined`.
  z.object({
    ...mountBase,
    type: z.literal('tmpfs'),
    source: z.never(),
    tmpfsOptions: tmpfsOptionsSchema.optional(),
  }),
])

export type DockerResourceMount = z.infer<typeof mountSchema>

export const dockerResourceConfigDataSchema = z
  .object({
    mounts: mountSchema.array().optional(),
    env: z.record(z.string(), z.string()).optional(),
    gpus: z
      .object({ driver: z.string(), deviceIds: z.string().array() })
      .optional(),
    extraHosts: z.string().array().optional(),
    networkMode: z.string().nonempty().optional(),
    capAdd: z.string().array().optional(),
    capDrop: z.string().array().optional(),
    securityOpt: z.string().array().optional(),
    ports: z
      .array(
        z.object({
          host: z.number().positive().max(65535),
          container: z.number().positive().max(65535),
          protocol: z.enum(['tcp', 'udp']).default('tcp'),
        }),
      )
      .optional(),
    restartPolicy: z
      .enum(['no', 'always', 'unless-stopped', 'on-failure'])
      .optional(),
    shmSize: z.number().positive().optional(),
    tmpfs: z.record(z.string(), z.string()).optional(),
    devices: z.string().array().optional(),
    ulimits: z
      .record(z.string(), z.object({ soft: z.number(), hard: z.number() }))
      .optional(),
    sysctls: z.record(z.string(), z.string()).optional(),
    labels: z.record(z.string(), z.string()).optional(),
    privileged: z.boolean().optional(),
    readOnly: z.boolean().optional(),
    user: z.string().optional(),
    workingDir: z.string().optional(),
    hostname: z.string().optional(),
    domainName: z.string().optional(),
    dns: z.string().array().optional(),
    dnsSearch: z.string().array().optional(),
    entrypoint: z.string().array().optional(),
    command: z.string().array().optional(),
    stopSignal: z.string().optional(),
    stopTimeout: z.number().optional(),
    memoryLimit: z.number().positive().optional(),
    cpuShares: z.number().positive().optional(),
    cpuQuota: z.number().optional(),
    pidsLimit: z.number().positive().optional(),
    ipcMode: z.string().optional(),
    pidMode: z.string().optional(),
    cgroupParent: z.string().optional(),
    runtime: z.string().optional(),
  })
  .meta({ id: 'DockerResourceConfig' })
