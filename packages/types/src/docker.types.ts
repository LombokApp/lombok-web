import { z } from 'zod'

import type { JsonSerializableObject } from './json.types'
import type { StorageAccessPolicy } from './task.types'

// Mount schema: each options object requires at least one field so the
// no-op empty-object shape is unrepresentable in both types and validation.

const driverConfigSchema = z.object({
  name: z.string().nonempty(),
  options: z.record(z.string(), z.string()).optional(),
  // Lombok-managed: subpath created under the volume root pre-start, then appended to the driver's `device`; stripped before forwarding to Docker.
  createSubpath: z.string().nonempty().optional(),
})

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

// Common mount fields; `source` lives per-variant since its nullability is type-dependent (volume: optional, bind: required, tmpfs: forbidden).
const mountBase = {
  target: z.string().nonempty(),
  readOnly: z.boolean().optional(),
}

export const mountSchema = z
  .discriminatedUnion('type', [
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
    // tmpfs: `source` must be absent (any value is a parse error).
    z.object({
      ...mountBase,
      type: z.literal('tmpfs'),
      source: z.never(),
      tmpfsOptions: tmpfsOptionsSchema.optional(),
    }),
  ])
  .meta({ id: 'DockerResourceMount' })

export type DockerResourceMount = z.infer<typeof mountSchema>

export interface ExecuteAppDockerJobOptions {
  appIdentifier: string
  profileIdentifier: string
  jobIdentifier: string
  jobData: JsonSerializableObject
  storageAccessPolicy?: StorageAccessPolicy
  asyncTask?: {
    taskId: string
    jobId: string
  }
  targetUserId?: string
}

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

export const dockerProfileResourceAssignmentDTOSchema = z
  .object({
    id: z.string(),
    appIdentifier: z.string(),
    profileKey: z.string(),
    dockerHostId: z.string(),
    config: dockerResourceConfigDataSchema,
    configHashes: z.record(z.string(), z.string()),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .meta({ id: 'DockerProfileResourceAssignment' })

export type DockerProfileResourceAssignmentDTO = z.infer<
  typeof dockerProfileResourceAssignmentDTOSchema
>
