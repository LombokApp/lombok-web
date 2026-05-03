import type net from 'node:net'

import { z } from 'zod'

export interface ExecOptions {
  tty: boolean
  env?: string[]
  workingDir?: string
  user?: string
}

export interface StartExecOptions {
  tty: boolean
  stdin?: boolean
}

export interface ExecInspect {
  running: boolean
  exitCode: number | null
  pid: number
}

export interface ContainerInfo {
  id: string
  names: string[]
  state: string
}

// ─── Mount schema — Zod, peer of the API-side schema in packages/api's
// DTO. Validates at the bridge boundary (defence in depth) and is the
// single source of truth for the BridgeMount TS type below.

const driverConfigSchema = z.object({
  name: z.string().nonempty(),
  options: z.record(z.string(), z.string()).optional(),
})

const volumeOptionsSchema = z.object({
  noCopy: z.boolean(),
  labels: z.record(z.string(), z.string()),
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

// `source` lives on each variant — its nullability is type-dependent:
//   • volume — optional (omitted = anonymous volume)
//   • bind   — required (must name a host path)
//   • tmpfs  — forbidden (no backing path; in-memory filesystem)
const mountBase = {
  target: z.string().nonempty(),
  readOnly: z.boolean().optional(),
  consistency: z
    .enum(['default', 'consistent', 'cached', 'delegated'])
    .optional(),
}

export const bridgeMountSchema = z.discriminatedUnion('type', [
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
  z.object({
    ...mountBase,
    type: z.literal('tmpfs'),
    source: z.never().optional(),
    tmpfsOptions: tmpfsOptionsSchema.optional(),
  }),
])

export type BridgeMount = z.infer<typeof bridgeMountSchema>

export interface CreateContainerOptions {
  image: string
  labels: Record<string, string>
  env?: Record<string, string>
  extraHosts?: string[]
  mounts?: BridgeMount[]
  networkMode?: string
  gpus?: { driver: string; deviceIds: string[] }
  capAdd?: string[]
  capDrop?: string[]
  securityOpt?: string[]
  ports?: { host: number; container: number; protocol: 'tcp' | 'udp' }[]
  restartPolicy?: 'no' | 'always' | 'unless-stopped' | 'on-failure'
  shmSize?: number
  tmpfs?: Record<string, string>
  devices?: string[]
  ulimits?: Record<string, { soft: number; hard: number }>
  sysctls?: Record<string, string>
  privileged?: boolean
  readOnly?: boolean
  user?: string
  workingDir?: string
  hostname?: string
  domainName?: string
  dns?: string[]
  dnsSearch?: string[]
  entrypoint?: string[]
  command?: string[]
  stopSignal?: string
  stopTimeout?: number
  memoryLimit?: number
  cpuShares?: number
  cpuQuota?: number
  pidsLimit?: number
  ipcMode?: string
  pidMode?: string
  cgroupParent?: string
  runtime?: string
  start: boolean
}

export interface BridgeContainerInfo {
  id: string
  image: string
  labels: Record<string, string>
  state: string
  reusable: boolean
  createdAt: string
  names: string[]
}

export interface ConnectionTestResult {
  success: boolean
  version?: string
  apiVersion?: string
  error?: string
}

export interface ContainerStats {
  cpuPercent?: number
  memoryBytes?: number
  memoryLimitBytes?: number
  memoryPercent?: number
}

export interface LogEntry {
  stream: 'stdout' | 'stderr'
  text: string
}

export interface HostResources {
  cpuCores?: number
  memoryBytes?: number
  info: Record<string, unknown>
}

export interface PullImageOptions {
  registryAuth?: {
    username: string
    password: string
    serveraddress?: string
  }
}

export interface DockerAdapter {
  // Exec lifecycle (tunnel/session use)
  createExec: (
    containerId: string,
    cmd: string[],
    opts: ExecOptions,
  ) => Promise<string>
  startExec: (execId: string, opts: StartExecOptions) => Promise<net.Socket>
  resizeExec: (execId: string, cols: number, rows: number) => Promise<void>
  inspectExec: (execId: string) => Promise<ExecInspect>
  killExec: (containerId: string, execPid: number) => Promise<void>
  ping: () => Promise<boolean>

  // Synchronous exec (run command, wait for completion, return output)
  execSync: (
    containerId: string,
    command: string[],
    options?: { env?: string[]; user?: string },
  ) => Promise<{ stdout: string; stderr: string; exitCode: number }>

  // Container lifecycle
  createContainer: (
    options: CreateContainerOptions,
  ) => Promise<BridgeContainerInfo>
  startContainer: (containerId: string) => Promise<void>
  stopContainer: (containerId: string) => Promise<void>
  restartContainer: (containerId: string) => Promise<void>
  removeContainer: (
    containerId: string,
    options?: { force?: boolean },
  ) => Promise<void>

  // Container info
  listContainers: () => Promise<ContainerInfo[]>
  getContainerInspect: (containerId: string) => Promise<unknown>
  getContainerStats: (containerId: string) => Promise<ContainerStats>
  getContainerLogs: (
    containerId: string,
    options?: { tail?: number },
  ) => Promise<LogEntry[]>
  isContainerRunning: (containerId: string) => Promise<boolean>
  listContainersByLabels: (
    labels: Record<string, string>,
  ) => Promise<BridgeContainerInfo[]>

  // Host
  testConnection: () => Promise<ConnectionTestResult>
  getHostResources: () => Promise<HostResources>

  // Image
  pullImage: (image: string, options?: PullImageOptions) => Promise<void>
}
