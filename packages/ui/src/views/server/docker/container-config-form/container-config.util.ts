import type { DockerContainerResourceConfig } from '@lombokapp/types'

import type { ContainerConfigState } from './container-config.types'

// ─── Helpers ──────────────────────────────────────────────────────────────

function parseStringArray(val: unknown): string {
  return Array.isArray(val) ? (val as string[]).join('\n') : ''
}

function parseKeyValueRecord(val: unknown): string {
  if (!val || typeof val !== 'object') {
    return ''
  }
  return Object.entries(val as Record<string, string>)
    .map(([k, v]) => `${k}=${v}`)
    .join('\n')
}

function stringToLines(s: string): string[] {
  return s
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
}

function stringToKeyValueRecord(s: string): Record<string, string> | undefined {
  const entries: Record<string, string> = {}
  for (const line of s.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed) {
      continue
    }
    const eqIdx = trimmed.indexOf('=')
    if (eqIdx > 0) {
      entries[trimmed.slice(0, eqIdx)] = trimmed.slice(eqIdx + 1)
    }
  }
  return Object.keys(entries).length > 0 ? entries : undefined
}

function mountsToJson(val: ConfigMount[] | undefined): string {
  if (!val || val.length === 0) {
    return ''
  }
  return JSON.stringify(val, null, 2)
}

type ConfigMount = NonNullable<DockerContainerResourceConfig['mounts']>[number]

// Parse the textarea contents. Returns undefined for empty/whitespace
// (meaning "no mounts configured"). Returns the parsed array for well-
// formed JSON. Returns the error string itself so the caller can preserve
// the user's in-progress input on the server round-trip — the server will
// still reject it via Zod validation, which is the source of truth.
export function mountsFromJson(
  s: string,
):
  | { kind: 'empty' }
  | { kind: 'valid'; value: ConfigMount[] }
  | { kind: 'invalid'; error: string } {
  const trimmed = s.trim()
  if (!trimmed) {
    return { kind: 'empty' }
  }
  try {
    const parsed: unknown = JSON.parse(trimmed)
    if (!Array.isArray(parsed)) {
      return { kind: 'invalid', error: 'Expected a JSON array of mounts' }
    }
    return { kind: 'valid', value: parsed as ConfigMount[] }
  } catch (err) {
    return {
      kind: 'invalid',
      error: err instanceof Error ? err.message : String(err),
    }
  }
}

// ─── Public API ───────────────────────────────────────────────────────────

/**
 * Load a config object into the form-friendly state shape used by useContainerConfigForm.
 */
export function loadConfigState(
  cfg: DockerContainerResourceConfig,
): ContainerConfigState {
  return {
    mounts: mountsToJson(cfg.mounts),
    tmpfs: parseKeyValueRecord(cfg.tmpfs),
    devices: parseStringArray(cfg.devices),
    env: (() => {
      const e = cfg.env
      if (!e || typeof e !== 'object') {
        return ''
      }
      return Object.entries(e as Record<string, string>)
        .map(([k, v]) => `${k}=${v}`)
        .join('\n')
    })(),
    ports: (() => {
      const p = cfg.ports
      if (!Array.isArray(p)) {
        return []
      }
      return p.map((port) => ({
        host: String(port.host),
        container: String(port.container),
        protocol: ((port as { protocol?: string }).protocol ?? 'tcp') as
          | 'tcp'
          | 'udp',
      }))
    })(),
    networkMode: cfg.networkMode ?? '',
    extraHosts: parseStringArray(cfg.extraHosts),
    hostname: cfg.hostname ?? '',
    domainName: cfg.domainName ?? '',
    dns: parseStringArray(cfg.dns),
    dnsSearch: parseStringArray(cfg.dnsSearch),
    memoryLimit: cfg.memoryLimit ? String(cfg.memoryLimit) : '',
    cpuShares: cfg.cpuShares ? String(cfg.cpuShares) : '',
    cpuQuota: cfg.cpuQuota ? String(cfg.cpuQuota) : '',
    pidsLimit: cfg.pidsLimit ? String(cfg.pidsLimit) : '',
    shmSize: cfg.shmSize ? String(cfg.shmSize) : '',
    gpuDeviceIds: cfg.gpus?.deviceIds.join(', ') ?? '',
    entrypoint: parseStringArray(cfg.entrypoint),
    command: parseStringArray(cfg.command),
    workingDir: cfg.workingDir ?? '',
    user: cfg.user ?? '',
    stopSignal: cfg.stopSignal ?? '',
    stopTimeout: cfg.stopTimeout ? String(cfg.stopTimeout) : '',
    restartPolicy: cfg.restartPolicy ?? 'none',
    privileged: cfg.privileged ?? false,
    readOnly: cfg.readOnly ?? false,
    capAdd: parseStringArray(cfg.capAdd),
    capDrop: parseStringArray(cfg.capDrop),
    securityOpt: parseStringArray(cfg.securityOpt),
    ipcMode: cfg.ipcMode ?? '',
    pidMode: cfg.pidMode ?? '',
    cgroupParent: cfg.cgroupParent ?? '',
    runtime: cfg.runtime ?? '',
    labels: parseKeyValueRecord(cfg.labels),
    ulimits: cfg.ulimits
      ? Object.entries(cfg.ulimits)
          .map(([k, v]) => `${k}=${v.soft}:${v.hard}`)
          .join('\n')
      : '',
    sysctls: parseKeyValueRecord(cfg.sysctls),
  }
}

/**
 * Serialize form state back to a config object for the API.
 */
export function buildConfigFromState(
  s: ContainerConfigState,
): DockerContainerResourceConfig {
  const config: DockerContainerResourceConfig = {}

  // Mounts is a JSON textarea. Well-formed JSON wins; invalid / in-progress
  // input drops the field (server would reject it anyway). Empty = omit.
  const parsedMounts = mountsFromJson(s.mounts)
  if (parsedMounts.kind === 'valid') {
    config.mounts = parsedMounts.value
  }
  const tmpfsRecord = stringToKeyValueRecord(s.tmpfs)
  if (tmpfsRecord) {
    config.tmpfs = tmpfsRecord
  }
  const deviceLines = stringToLines(s.devices)
  if (deviceLines.length > 0) {
    config.devices = deviceLines
  }

  const envRecord = stringToKeyValueRecord(s.env)
  if (envRecord) {
    config.env = envRecord
  }

  const parsedPorts = s.ports
    .filter((p) => p.host && p.container)
    .map((p) => ({
      host: Number(p.host),
      container: Number(p.container),
      protocol: p.protocol,
    }))
  if (parsedPorts.length > 0) {
    config.ports = parsedPorts
  }
  if (s.networkMode) {
    config.networkMode = s.networkMode
  }
  const extraHostLines = stringToLines(s.extraHosts)
  if (extraHostLines.length > 0) {
    config.extraHosts = extraHostLines
  }
  if (s.hostname) {
    config.hostname = s.hostname
  }
  if (s.domainName) {
    config.domainName = s.domainName
  }
  const dnsLines = stringToLines(s.dns)
  if (dnsLines.length > 0) {
    config.dns = dnsLines
  }
  const dnsSearchLines = stringToLines(s.dnsSearch)
  if (dnsSearchLines.length > 0) {
    config.dnsSearch = dnsSearchLines
  }

  if (s.memoryLimit) {
    config.memoryLimit = Number(s.memoryLimit)
  }
  if (s.cpuShares) {
    config.cpuShares = Number(s.cpuShares)
  }
  if (s.cpuQuota) {
    config.cpuQuota = Number(s.cpuQuota)
  }
  if (s.pidsLimit) {
    config.pidsLimit = Number(s.pidsLimit)
  }
  if (s.shmSize) {
    config.shmSize = Number(s.shmSize)
  }
  const gpuIds = s.gpuDeviceIds
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean)
  if (gpuIds.length > 0) {
    config.gpus = { driver: 'nvidia', deviceIds: gpuIds }
  }

  const entrypointLines = stringToLines(s.entrypoint)
  if (entrypointLines.length > 0) {
    config.entrypoint = entrypointLines
  }
  const commandLines = stringToLines(s.command)
  if (commandLines.length > 0) {
    config.command = commandLines
  }
  if (s.workingDir) {
    config.workingDir = s.workingDir
  }
  if (s.user) {
    config.user = s.user
  }
  if (s.stopSignal) {
    config.stopSignal = s.stopSignal
  }
  if (s.stopTimeout) {
    config.stopTimeout = Number(s.stopTimeout)
  }
  if (s.restartPolicy !== 'none') {
    config.restartPolicy = s.restartPolicy
  }

  if (s.privileged) {
    config.privileged = true
  }
  if (s.readOnly) {
    config.readOnly = true
  }
  const capAddLines = stringToLines(s.capAdd)
  if (capAddLines.length > 0) {
    config.capAdd = capAddLines
  }
  const capDropLines = stringToLines(s.capDrop)
  if (capDropLines.length > 0) {
    config.capDrop = capDropLines
  }
  const securityOptLines = stringToLines(s.securityOpt)
  if (securityOptLines.length > 0) {
    config.securityOpt = securityOptLines
  }

  if (s.ipcMode) {
    config.ipcMode = s.ipcMode
  }
  if (s.pidMode) {
    config.pidMode = s.pidMode
  }
  if (s.cgroupParent) {
    config.cgroupParent = s.cgroupParent
  }
  if (s.runtime) {
    config.runtime = s.runtime
  }

  const labelsRecord = stringToKeyValueRecord(s.labels)
  if (labelsRecord) {
    config.labels = labelsRecord
  }
  const sysctlsRecord = stringToKeyValueRecord(s.sysctls)
  if (sysctlsRecord) {
    config.sysctls = sysctlsRecord
  }
  if (s.ulimits) {
    const parsed: Record<string, { soft: number; hard: number }> = {}
    for (const line of stringToLines(s.ulimits)) {
      const eqIdx = line.indexOf('=')
      if (eqIdx > 0) {
        const key = line.slice(0, eqIdx)
        const [softStr, hardStr] = line.slice(eqIdx + 1).split(':')
        if (softStr && hardStr) {
          parsed[key] = { soft: Number(softStr), hard: Number(hardStr) }
        }
      }
    }
    if (Object.keys(parsed).length > 0) {
      config.ulimits = parsed
    }
  }

  return config
}
