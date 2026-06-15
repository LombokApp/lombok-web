import { Button } from '@lombokapp/ui-toolkit/components/button'
import { Input } from '@lombokapp/ui-toolkit/components/input'
import { Label } from '@lombokapp/ui-toolkit/components/label'
import { ScrollArea } from '@lombokapp/ui-toolkit/components/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@lombokapp/ui-toolkit/components/select'
import { Switch } from '@lombokapp/ui-toolkit/components/switch'
import { Plus, Trash2 } from 'lucide-react'

import type { ContainerConfigState, PortRow } from './container-config.types'
import { mountsFromJson } from './container-config.util'

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

  const mountsParse = mountsFromJson(state.mounts)

  return (
    <div className="relative flex max-h-max min-h-0 rounded-lg border border-muted/40 bg-muted">
      <div className="pointer-events-none absolute -inset-x-px -top-px z-10 h-7 rounded-t-lg bg-linear-to-b from-muted to-transparent" />
      <div className="pointer-events-none absolute -inset-x-px -bottom-px z-10 h-7 rounded-b-lg bg-linear-to-t from-muted to-transparent" />
      <ScrollArea>
        <div className="flex flex-col gap-4 p-4">
          {/* ── Storage ─────────────────────────────────────────── */}
          <div className="flex flex-col gap-3">
            <h3 className="text-sm font-medium">Storage</h3>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="cfg-mounts">Mounts (JSON)</Label>
              <textarea
                id="cfg-mounts"
                className="min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-sm placeholder:text-muted-foreground"
                placeholder={`[\n  {\n    "type": "volume",\n    "target": "/workspace",\n    "volumeOptions": {\n      "driverConfig": {\n        "name": "local",\n        "options": {\n          "type": "nfs",\n          "o": "addr=10.0.0.5,nfsvers=4,rw",\n          "device": ":/mnt/user/codicle/{{appIdentifier}}"\n        }\n      }\n    }\n  }\n]`}
                value={state.mounts}
                onChange={(e) => set('mounts', e.target.value)}
                rows={10}
                spellCheck={false}
              />
              {mountsParse.kind === 'invalid' ? (
                <p className="text-xs text-destructive">
                  Invalid JSON: {mountsParse.error}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  JSON array of Docker mounts. Strings (e.g. {'{{ '}
                  appIdentifier {'}}'}) are templatable. Empty = no mounts.
                </p>
              )}
            </div>
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
