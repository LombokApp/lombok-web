import type { DockerContainerResourceConfig } from '@lombokapp/types'
import { Button } from '@lombokapp/ui-toolkit/components/button/button'
import { Input } from '@lombokapp/ui-toolkit/components/input/input'
import { Label } from '@lombokapp/ui-toolkit/components/label/label'
import { ScrollArea } from '@lombokapp/ui-toolkit/components/scroll-area/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@lombokapp/ui-toolkit/components/select/select'
import { Switch } from '@lombokapp/ui-toolkit/components/switch/switch'
import { Plus, Trash2 } from 'lucide-react'

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

// ─── Sub-components ───────────────────────────────────────────────────────

function ConfigTextarea({
  id,
  label,
  placeholder,
  hint,
  value,
  onChange,
  rows = 3,
}: {
  id: string
  label: string
  placeholder: string
  hint?: string
  value: string
  onChange: (v: string) => void
  rows?: number
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <textarea
        id={id}
        className="min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-sm placeholder:text-muted-foreground"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
      />
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}

interface PortRow {
  host: string
  container: string
  protocol: 'tcp' | 'udp'
}

// ─── Public API ───────────────────────────────────────────────────────────

/**
 * Load a config object into the form-friendly state shape used by useContainerConfigForm.
 */
export function loadConfigState(
  cfg: DockerContainerResourceConfig,
): ContainerConfigState {
  return {
    volumes: parseStringArray(cfg.volumes),
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

  const volLines = stringToLines(s.volumes)
  if (volLines.length > 0) {
    config.volumes = volLines
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

export interface ContainerConfigState {
  volumes: string
  tmpfs: string
  devices: string
  env: string
  ports: PortRow[]
  networkMode: string
  extraHosts: string
  hostname: string
  domainName: string
  dns: string
  dnsSearch: string
  memoryLimit: string
  cpuShares: string
  cpuQuota: string
  pidsLimit: string
  shmSize: string
  gpuDeviceIds: string
  entrypoint: string
  command: string
  workingDir: string
  user: string
  stopSignal: string
  stopTimeout: string
  restartPolicy: 'no' | 'always' | 'unless-stopped' | 'on-failure' | 'none'
  privileged: boolean
  readOnly: boolean
  capAdd: string
  capDrop: string
  securityOpt: string
  ipcMode: string
  pidMode: string
  cgroupParent: string
  runtime: string
  labels: string
  ulimits: string
  sysctls: string
}

export const EMPTY_CONFIG_STATE: ContainerConfigState = {
  volumes: '',
  tmpfs: '',
  devices: '',
  env: '',
  ports: [],
  networkMode: '',
  extraHosts: '',
  hostname: '',
  domainName: '',
  dns: '',
  dnsSearch: '',
  memoryLimit: '',
  cpuShares: '',
  cpuQuota: '',
  pidsLimit: '',
  shmSize: '',
  gpuDeviceIds: '',
  entrypoint: '',
  command: '',
  workingDir: '',
  user: '',
  stopSignal: '',
  stopTimeout: '',
  restartPolicy: 'none',
  privileged: false,
  readOnly: false,
  capAdd: '',
  capDrop: '',
  securityOpt: '',
  ipcMode: '',
  pidMode: '',
  cgroupParent: '',
  runtime: '',
  labels: '',
  ulimits: '',
  sysctls: '',
}

// ─── Form component ──────────────────────────────────────────────────────

export function ContainerConfigForm({
  state,
  onChange,
}: {
  state: ContainerConfigState
  onChange: (next: ContainerConfigState) => void
}) {
  const set = <K extends keyof ContainerConfigState>(
    key: K,
    value: ContainerConfigState[K],
  ) => onChange({ ...state, ...{ [key]: value } })

  const addPort = () =>
    set('ports', [...state.ports, { host: '', container: '', protocol: 'tcp' }])

  const removePort = (index: number) =>
    set(
      'ports',
      state.ports.filter((_, i) => i !== index),
    )

  const updatePort = (index: number, field: keyof PortRow, value: string) =>
    set(
      'ports',
      state.ports.map((p, i) => (i === index ? { ...p, [field]: value } : p)),
    )

  return (
    <div className="relative flex max-h-max min-h-0 rounded-lg border border-muted/40 bg-muted">
      <div className="pointer-events-none absolute -inset-x-px -top-px z-10 h-7 rounded-t-lg bg-linear-to-b from-muted to-transparent" />
      <div className="pointer-events-none absolute -inset-x-px -bottom-px z-10 h-7 rounded-b-lg bg-linear-to-t from-muted to-transparent" />
      <ScrollArea>
        <div className="flex flex-col gap-4 p-4">
          {/* ── Storage ─────────────────────────────────────────── */}
          <div className="flex flex-col gap-3">
            <h3 className="text-sm font-medium">Storage</h3>
            <ConfigTextarea
              id="cfg-volumes"
              label="Volumes"
              placeholder={'/host/path:/container/path\n/data:/data:ro'}
              hint="One volume mount per line."
              value={state.volumes}
              onChange={(v) => set('volumes', v)}
            />
            <div className="grid grid-cols-2 gap-3">
              <ConfigTextarea
                id="cfg-tmpfs"
                label="tmpfs"
                placeholder={'/run=size=100m\n/tmp='}
                hint="path=options per line."
                value={state.tmpfs}
                onChange={(v) => set('tmpfs', v)}
                rows={2}
              />
              <ConfigTextarea
                id="cfg-devices"
                label="Devices"
                placeholder={'/dev/sda:/dev/xvdc:rwm'}
                hint="One device per line."
                value={state.devices}
                onChange={(v) => set('devices', v)}
                rows={2}
              />
            </div>
          </div>

          {/* ── Environment ─────────────────────────────────────── */}
          <div className="flex flex-col gap-3">
            <h3 className="text-sm font-medium">Environment</h3>
            <ConfigTextarea
              id="cfg-env"
              label="Environment Variables"
              placeholder={'KEY=value\nDATABASE_URL=postgres://...'}
              hint="One KEY=value per line."
              value={state.env}
              onChange={(v) => set('env', v)}
            />
          </div>

          {/* ── Networking ──────────────────────────────────────── */}
          <div className="flex flex-col gap-3">
            <h3 className="text-sm font-medium">Networking</h3>
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <Label>Port Mappings</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={addPort}
                >
                  <Plus className="mr-1 size-3" />
                  Add Port
                </Button>
              </div>
              {state.ports.length === 0 && (
                <p className="text-xs text-muted-foreground italic">
                  No port mappings.
                </p>
              )}
              {state.ports.map((port, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Input
                    placeholder="Host"
                    className="w-24"
                    type="number"
                    min={1}
                    max={65535}
                    value={port.host}
                    onChange={(e) => updatePort(index, 'host', e.target.value)}
                  />
                  <span className="text-xs text-muted-foreground">:</span>
                  <Input
                    placeholder="Container"
                    className="w-24"
                    type="number"
                    min={1}
                    max={65535}
                    value={port.container}
                    onChange={(e) =>
                      updatePort(index, 'container', e.target.value)
                    }
                  />
                  <Select
                    value={port.protocol}
                    onValueChange={(v) => updatePort(index, 'protocol', v)}
                  >
                    <SelectTrigger className="w-20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="tcp">TCP</SelectItem>
                      <SelectItem value="udp">UDP</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="size-7 p-0"
                    onClick={() => removePort(index)}
                  >
                    <Trash2 className="size-3 text-muted-foreground" />
                  </Button>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="cfg-network">Network Mode</Label>
                <Input
                  id="cfg-network"
                  placeholder="e.g. host, bridge"
                  value={state.networkMode}
                  onChange={(e) => set('networkMode', e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="cfg-hostname">Hostname</Label>
                <Input
                  id="cfg-hostname"
                  placeholder="e.g. my-container"
                  value={state.hostname}
                  onChange={(e) => set('hostname', e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="cfg-domainname">Domain Name</Label>
                <Input
                  id="cfg-domainname"
                  placeholder="e.g. example.com"
                  value={state.domainName}
                  onChange={(e) => set('domainName', e.target.value)}
                />
              </div>
              <ConfigTextarea
                id="cfg-extrahosts"
                label="Extra Hosts"
                placeholder={'host:ip\ndb:10.0.0.5'}
                hint="One host:ip per line."
                value={state.extraHosts}
                onChange={(v) => set('extraHosts', v)}
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <ConfigTextarea
                id="cfg-dns"
                label="DNS Servers"
                placeholder={'8.8.8.8\n8.8.4.4'}
                hint="One IP per line."
                value={state.dns}
                onChange={(v) => set('dns', v)}
                rows={2}
              />
              <ConfigTextarea
                id="cfg-dnssearch"
                label="DNS Search"
                placeholder={'example.com\nsvc.cluster.local'}
                hint="One domain per line."
                value={state.dnsSearch}
                onChange={(v) => set('dnsSearch', v)}
                rows={2}
              />
            </div>
          </div>

          {/* ── Resources ──────────────────────────────────────── */}
          <div className="flex flex-col gap-3">
            <h3 className="text-sm font-medium">Resources</h3>
            <div className="grid grid-cols-3 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="cfg-memory">Memory Limit (bytes)</Label>
                <Input
                  id="cfg-memory"
                  type="number"
                  placeholder="e.g. 536870912"
                  value={state.memoryLimit}
                  onChange={(e) => set('memoryLimit', e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="cfg-cpu">CPU Shares</Label>
                <Input
                  id="cfg-cpu"
                  type="number"
                  placeholder="e.g. 1024"
                  value={state.cpuShares}
                  onChange={(e) => set('cpuShares', e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="cfg-cpuquota">CPU Quota</Label>
                <Input
                  id="cfg-cpuquota"
                  type="number"
                  placeholder="e.g. 50000"
                  value={state.cpuQuota}
                  onChange={(e) => set('cpuQuota', e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="cfg-pidslimit">PIDs Limit</Label>
                <Input
                  id="cfg-pidslimit"
                  type="number"
                  placeholder="e.g. 100"
                  value={state.pidsLimit}
                  onChange={(e) => set('pidsLimit', e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="cfg-shmsize">Shared Memory (bytes)</Label>
                <Input
                  id="cfg-shmsize"
                  type="number"
                  placeholder="e.g. 67108864"
                  value={state.shmSize}
                  onChange={(e) => set('shmSize', e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="cfg-gpu">GPU Device IDs</Label>
                <Input
                  id="cfg-gpu"
                  placeholder="e.g. 0, 1"
                  value={state.gpuDeviceIds}
                  onChange={(e) => set('gpuDeviceIds', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* ── Process ────────────────────────────────────────── */}
          <div className="flex flex-col gap-3">
            <h3 className="text-sm font-medium">Process</h3>
            <div className="grid grid-cols-2 gap-3">
              <ConfigTextarea
                id="cfg-entrypoint"
                label="Entrypoint"
                placeholder={'/bin/sh\n-c'}
                hint="One arg per line."
                value={state.entrypoint}
                onChange={(v) => set('entrypoint', v)}
                rows={2}
              />
              <ConfigTextarea
                id="cfg-command"
                label="Command"
                placeholder={'echo\nhello'}
                hint="One arg per line."
                value={state.command}
                onChange={(v) => set('command', v)}
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="cfg-workingdir">Working Directory</Label>
                <Input
                  id="cfg-workingdir"
                  placeholder="e.g. /app"
                  value={state.workingDir}
                  onChange={(e) => set('workingDir', e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="cfg-user">User</Label>
                <Input
                  id="cfg-user"
                  placeholder="e.g. 1000:1000"
                  value={state.user}
                  onChange={(e) => set('user', e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="cfg-restart">Restart Policy</Label>
                <Select
                  value={state.restartPolicy}
                  onValueChange={(v) =>
                    set(
                      'restartPolicy',
                      v as ContainerConfigState['restartPolicy'],
                    )
                  }
                >
                  <SelectTrigger id="cfg-restart">
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="no">No</SelectItem>
                    <SelectItem value="always">Always</SelectItem>
                    <SelectItem value="unless-stopped">
                      Unless Stopped
                    </SelectItem>
                    <SelectItem value="on-failure">On Failure</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="cfg-stopsignal">Stop Signal</Label>
                <Input
                  id="cfg-stopsignal"
                  placeholder="e.g. SIGTERM"
                  value={state.stopSignal}
                  onChange={(e) => set('stopSignal', e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="cfg-stoptimeout">Stop Timeout (s)</Label>
                <Input
                  id="cfg-stoptimeout"
                  type="number"
                  placeholder="e.g. 10"
                  value={state.stopTimeout}
                  onChange={(e) => set('stopTimeout', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* ── Security ───────────────────────────────────────── */}
          <div className="flex flex-col gap-3">
            <h3 className="text-sm font-medium">Security</h3>
            <div className="flex gap-8">
              <div className="flex items-center gap-2">
                <Switch
                  id="cfg-privileged"
                  checked={state.privileged}
                  onCheckedChange={(v) => set('privileged', v)}
                />
                <Label htmlFor="cfg-privileged">Privileged</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="cfg-readonly"
                  checked={state.readOnly}
                  onCheckedChange={(v) => set('readOnly', v)}
                />
                <Label htmlFor="cfg-readonly">Read-only Root FS</Label>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <ConfigTextarea
                id="cfg-capadd"
                label="Cap Add"
                placeholder={'SYS_PTRACE\nNET_ADMIN'}
                hint="One capability per line."
                value={state.capAdd}
                onChange={(v) => set('capAdd', v)}
                rows={2}
              />
              <ConfigTextarea
                id="cfg-capdrop"
                label="Cap Drop"
                placeholder={'MKNOD\nAUDIT_WRITE'}
                hint="One capability per line."
                value={state.capDrop}
                onChange={(v) => set('capDrop', v)}
                rows={2}
              />
              <ConfigTextarea
                id="cfg-securityopt"
                label="Security Options"
                placeholder={'no-new-privileges\napparmor=unconfined'}
                hint="One option per line."
                value={state.securityOpt}
                onChange={(v) => set('securityOpt', v)}
                rows={2}
              />
            </div>
          </div>

          {/* ── Isolation ──────────────────────────────────────── */}
          <div className="flex flex-col gap-3">
            <h3 className="text-sm font-medium">Isolation</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="cfg-ipcmode">IPC Mode</Label>
                <Input
                  id="cfg-ipcmode"
                  placeholder="e.g. host, shareable"
                  value={state.ipcMode}
                  onChange={(e) => set('ipcMode', e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="cfg-pidmode">PID Mode</Label>
                <Input
                  id="cfg-pidmode"
                  placeholder="e.g. host"
                  value={state.pidMode}
                  onChange={(e) => set('pidMode', e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="cfg-cgroupparent">Cgroup Parent</Label>
                <Input
                  id="cfg-cgroupparent"
                  placeholder="e.g. /docker"
                  value={state.cgroupParent}
                  onChange={(e) => set('cgroupParent', e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="cfg-runtime">Runtime</Label>
                <Input
                  id="cfg-runtime"
                  placeholder="e.g. nvidia, runc"
                  value={state.runtime}
                  onChange={(e) => set('runtime', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* ── Metadata ──────────────────────────────────────── */}
          <div className="flex flex-col gap-3">
            <h3 className="text-sm font-medium">Metadata</h3>
            <div className="grid grid-cols-3 gap-3">
              <ConfigTextarea
                id="cfg-labels"
                label="Labels"
                placeholder={'app=myapp\nenv=prod'}
                hint="key=value per line."
                value={state.labels}
                onChange={(v) => set('labels', v)}
                rows={2}
              />
              <ConfigTextarea
                id="cfg-ulimits"
                label="Ulimits"
                placeholder={'nofile=1024:2048\nnproc=512:1024'}
                hint="name=soft:hard per line."
                value={state.ulimits}
                onChange={(v) => set('ulimits', v)}
                rows={2}
              />
              <ConfigTextarea
                id="cfg-sysctls"
                label="Sysctls"
                placeholder={'net.core.somaxconn=1024'}
                hint="key=value per line."
                value={state.sysctls}
                onChange={(v) => set('sysctls', v)}
                rows={2}
              />
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  )
}
