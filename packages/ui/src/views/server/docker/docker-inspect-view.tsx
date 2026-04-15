import {
  Badge,
  BadgeVariant,
} from '@lombokapp/ui-toolkit/components/badge/badge'
import { CardHeader, CardTitle } from '@lombokapp/ui-toolkit/components/card'
import { Card } from '@lombokapp/ui-toolkit/components/card/card'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@lombokapp/ui-toolkit/components/collapsible'
import { cn } from '@lombokapp/ui-toolkit/utils'
import {
  Activity,
  ChevronRight,
  Code2,
  Globe,
  HardDrive,
  Shield,
  TerminalSquare,
} from 'lucide-react'
import React from 'react'
import { z } from 'zod'

import { CodeValue } from '@/src/components/code-value/code-value'

// ─── Schemas ────────────────────────────────────────────────────────────────

const inspectStateSchema = z.object({
  Status: z.string(),
  Running: z.boolean(),
  Paused: z.boolean(),
  Restarting: z.boolean(),
  OOMKilled: z.boolean(),
  Dead: z.boolean(),
  Pid: z.number(),
  ExitCode: z.number(),
  Error: z.string(),
  StartedAt: z.string(),
  FinishedAt: z.string(),
})

const inspectConfigSchema = z.object({
  Hostname: z.string().optional(),
  User: z.string().optional(),
  Env: z.array(z.string()).nullable().optional(),
  Cmd: z.array(z.string()).nullable().optional(),
  Image: z.string().optional(),
  WorkingDir: z.string().optional(),
  Entrypoint: z.array(z.string()).nullable().optional(),
})

const inspectHostConfigSchema = z.object({
  NetworkMode: z.string().optional(),
  Privileged: z.boolean().optional(),
  CapAdd: z.array(z.string()).nullable().optional(),
  SecurityOpt: z.array(z.string()).nullable().optional(),
})

const inspectNetworkEntrySchema = z.object({
  IPAddress: z.string().optional(),
  Gateway: z.string().optional(),
  MacAddress: z.string().optional(),
})

const inspectNetworkSettingsSchema = z.object({
  IPAddress: z.string().optional(),
  Gateway: z.string().optional(),
  MacAddress: z.string().optional(),
  Networks: z
    .record(z.string(), inspectNetworkEntrySchema)
    .nullable()
    .optional(),
})

const inspectMountSchema = z.object({
  Type: z.string(),
  Source: z.string(),
  Destination: z.string(),
  Mode: z.string().optional(),
  RW: z.boolean(),
  Propagation: z.string().optional(),
})

const inspectDataSchema = z.object({
  State: inspectStateSchema.optional(),
  Config: inspectConfigSchema.optional(),
  HostConfig: inspectHostConfigSchema.optional(),
  NetworkSettings: inspectNetworkSettingsSchema.optional(),
  Mounts: z.array(inspectMountSchema).nullable().optional(),
})

type InspectData = z.infer<typeof inspectDataSchema>
type InspectState = z.infer<typeof inspectStateSchema>
type InspectConfig = z.infer<typeof inspectConfigSchema>
type InspectMount = z.infer<typeof inspectMountSchema>

// ─── Utilities ──────────────────────────────────────────────────────────────

function formatInspectDate(dateStr?: string): string | undefined {
  if (!dateStr || dateStr.startsWith('0001-')) {
    return undefined
  }
  try {
    return new Date(dateStr).toLocaleString()
  } catch {
    return dateStr
  }
}

// ─── Shared primitives ──────────────────────────────────────────────────────

function SectionGroup({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode
  title: string
  children: React.ReactNode
}) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
        {icon}
        {title}
      </div>
      {children}
    </div>
  )
}

function Field({
  label,
  value,
  mono,
  highlight,
}: {
  label: string
  value?: string | number | null
  mono?: boolean
  highlight?: boolean
}) {
  const isEmpty = value === undefined || value === null || value === ''
  const display = isEmpty ? (
    <span className="italic opacity-40">—</span>
  ) : (
    String(value)
  )
  return (
    <div>
      <div className="text-[0.65rem] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className={cn('mt-0.5 text-sm', highlight && 'text-destructive')}>
        {mono && !isEmpty ? <CodeValue>{display}</CodeValue> : display}
      </div>
    </div>
  )
}

function CollapsibleList({
  label,
  items,
  renderItem,
}: {
  label: string
  items: string[]
  renderItem: (item: string) => React.ReactNode
}) {
  const [listOpen, setListOpen] = React.useState(false)
  return (
    <Collapsible open={listOpen} onOpenChange={setListOpen} className="mt-3">
      <CollapsibleTrigger className="flex cursor-pointer items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground">
        <ChevronRight
          className={cn('size-3 transition-transform', listOpen && 'rotate-90')}
        />
        {label}
        <span className="font-normal opacity-60">({items.length})</span>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="mt-1 rounded border border-border bg-background">
          {items.map((item, i) => (
            <div
              key={i}
              className={cn(
                'px-3 py-1.5 font-mono text-xs',
                i < items.length - 1 && 'border-b border-border',
              )}
            >
              {renderItem(item)}
            </div>
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}

// ─── Section components ─────────────────────────────────────────────────────

function StateSection({ state }: { state: InspectState }) {
  return (
    <SectionGroup icon={<Activity className="size-3.5" />} title="State">
      <div className="grid gap-x-6 gap-y-2 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Status" value={state.Status} />
        <Field label="PID" value={state.Pid} mono />
        <Field label="Started" value={formatInspectDate(state.StartedAt)} />
        <Field
          label="Exit Code"
          value={state.ExitCode}
          highlight={state.ExitCode !== 0}
        />
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        {state.OOMKilled && (
          <Badge variant={BadgeVariant.destructive} className="text-xs">
            OOM Killed
          </Badge>
        )}
        {state.Restarting && (
          <Badge variant={BadgeVariant.outline} className="text-xs">
            Restarting
          </Badge>
        )}
      </div>
    </SectionGroup>
  )
}

function ConfigSection({ config }: { config: InspectConfig }) {
  const entrypoint = config.Entrypoint ?? []
  const cmd = config.Cmd ?? []
  const envVars = config.Env ?? []

  return (
    <SectionGroup icon={<TerminalSquare className="size-3.5" />} title="Config">
      <div className="grid gap-x-6 gap-y-2 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Image" value={config.Image} mono />
        <Field label="User" value={config.User || 'root'} />
        <Field label="WorkDir" value={config.WorkingDir} mono />
        <Field label="Hostname" value={config.Hostname} mono />
      </div>
      {(entrypoint.length > 0 || cmd.length > 0) && (
        <div className="mt-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Entrypoint / Command
          </div>
          <CodeValue className="mt-1 block w-full px-3 py-2">
            {[...entrypoint, ...cmd].join(' ')}
          </CodeValue>
        </div>
      )}
      {envVars.length > 0 && (
        <CollapsibleList
          label="Environment"
          items={envVars}
          renderItem={(v) => {
            const eqIdx = v.indexOf('=')
            if (eqIdx === -1) {
              return v
            }
            return (
              <>
                <span className="text-muted-foreground">
                  {v.slice(0, eqIdx)}
                </span>
                <span className="text-muted-foreground/40">=</span>
                <span className="break-all text-foreground">
                  {v.slice(eqIdx + 1)}
                </span>
              </>
            )
          }}
        />
      )}
    </SectionGroup>
  )
}

function NetworkSection({
  settings,
  networkMode,
}: {
  settings: z.infer<typeof inspectNetworkSettingsSchema>
  networkMode?: string
}) {
  const networks = settings.Networks

  return (
    <SectionGroup icon={<Globe className="size-3.5" />} title="Network">
      <div className="grid gap-x-6 gap-y-2 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="IP Address" value={settings.IPAddress} mono />
        <Field label="Gateway" value={settings.Gateway} mono />
        <Field label="MAC" value={settings.MacAddress} mono />
        <Field label="Mode" value={networkMode} />
      </div>
      {networks && Object.keys(networks).length > 0 && (
        <div className="mt-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Networks
          </div>
          <div className="mt-1 flex flex-wrap gap-2">
            {Object.entries(networks).map(([name, net]) => (
              <div
                key={name}
                className="rounded border border-border bg-background px-3 py-2 text-xs"
              >
                <span className="font-semibold">{name}</span>
                {net.IPAddress && (
                  <CodeValue className="ml-2">{net.IPAddress}</CodeValue>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </SectionGroup>
  )
}

function MountsSection({ mounts }: { mounts: InspectMount[] }) {
  return (
    <SectionGroup icon={<HardDrive className="size-3.5" />} title="Mounts">
      <div className="flex flex-col gap-2">
        {mounts.map((m, i) => (
          <div
            key={i}
            className="flex flex-col gap-0.5 rounded border border-border bg-background px-3 py-2 text-xs"
          >
            <div className="flex items-center gap-2">
              <Badge variant={BadgeVariant.outline} className="text-[0.6rem]">
                {m.Type}
              </Badge>
              {!m.RW && (
                <Badge variant={BadgeVariant.outline} className="text-[0.6rem]">
                  read-only
                </Badge>
              )}
            </div>
            <div className="mt-1 flex items-center gap-1.5">
              <CodeValue>{m.Source}</CodeValue>
              <span className="text-muted-foreground/40">→</span>
              <CodeValue>{m.Destination}</CodeValue>
            </div>
          </div>
        ))}
      </div>
    </SectionGroup>
  )
}

function SecuritySection({
  hostConfig,
}: {
  hostConfig?: z.infer<typeof inspectHostConfigSchema>
}) {
  const capAdd = hostConfig?.CapAdd
  const securityOpt = hostConfig?.SecurityOpt
  const privileged = hostConfig?.Privileged

  if (!capAdd?.length && !securityOpt?.length && !privileged) {
    return null
  }

  return (
    <SectionGroup icon={<Shield className="size-3.5" />} title="Security">
      <div className="flex flex-wrap gap-2">
        {privileged && (
          <Badge variant={BadgeVariant.destructive} className="text-xs">
            Privileged
          </Badge>
        )}
        {capAdd?.map((cap) => (
          <Badge
            key={cap}
            variant={BadgeVariant.outline}
            className="font-mono text-xs"
          >
            {cap}
          </Badge>
        ))}
      </div>
      {securityOpt && securityOpt.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {securityOpt.map((opt) => (
            <CodeValue key={opt}>{opt}</CodeValue>
          ))}
        </div>
      )}
    </SectionGroup>
  )
}

// ─── Main component ─────────────────────────────────────────────────────────

export function DockerInspectSection({
  data,
  isLoading,
  isError,
}: {
  data: unknown
  isLoading: boolean
  isError: boolean
}) {
  const [mode, setMode] = React.useState<'pretty' | 'json'>('pretty')
  const [open, setOpen] = React.useState(true)

  const parsed = React.useMemo<InspectData | undefined>(() => {
    if (!data || typeof data !== 'object') {
      return undefined
    }
    const result = inspectDataSchema.safeParse(data)
    if (!result.success) {
      return undefined
    }
    return result.data
  }, [data])

  if (isError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Container Details</CardTitle>
        </CardHeader>
        <div className="px-6 pb-6 text-sm text-destructive">
          Failed to load container inspect data.
        </div>
      </Card>
    )
  }

  if (isLoading || !data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Container Details</CardTitle>
        </CardHeader>
        <div className="px-6 pb-6 text-sm text-muted-foreground">
          {isLoading ? 'Loading...' : 'No inspect data available.'}
        </div>
      </Card>
    )
  }

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer select-none">
            <CardTitle className="flex items-center gap-2 text-lg">
              <ChevronRight
                className={cn(
                  'size-4 text-muted-foreground transition-transform',
                  open && 'rotate-90',
                )}
              />
              <Code2 className="size-3.5 text-muted-foreground" />
              Container Details
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="flex flex-col gap-6 px-6 pb-6">
            <div className="flex">
              <div className="inline-flex overflow-hidden text-xs">
                <button
                  type="button"
                  className={cn(
                    'cursor-pointer rounded-md rounded-r-none border border-r-0 border-border px-3 py-1 font-semibold',
                    mode === 'pretty'
                      ? 'bg-muted-foreground text-background border-(--muted-foreground)'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                  onClick={() => setMode('pretty')}
                >
                  Pretty
                </button>
                <button
                  type="button"
                  className={cn(
                    'cursor-pointer rounded-md rounded-l-none border border-l-0 border-border px-3 py-1 font-semibold',
                    mode === 'json'
                      ? 'bg-muted-foreground text-background border-(--foreground/80)'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                  onClick={() => setMode('json')}
                >
                  JSON
                </button>
              </div>
            </div>

            {mode === 'json' ? (
              <div className="rounded border border-border bg-background p-3">
                <pre className="max-h-[600px] overflow-auto whitespace-pre-wrap font-mono text-[0.65rem] leading-relaxed text-muted-foreground">
                  {JSON.stringify(data, null, 2)}
                </pre>
              </div>
            ) : parsed ? (
              <>
                {parsed.State && <StateSection state={parsed.State} />}
                {parsed.Config && <ConfigSection config={parsed.Config} />}
                {parsed.NetworkSettings && (
                  <NetworkSection
                    settings={parsed.NetworkSettings}
                    networkMode={parsed.HostConfig?.NetworkMode}
                  />
                )}
                {parsed.Mounts && parsed.Mounts.length > 0 && (
                  <MountsSection mounts={parsed.Mounts} />
                )}
                <SecuritySection hostConfig={parsed.HostConfig} />
              </>
            ) : (
              <div className="text-sm text-muted-foreground">
                Inspect data could not be parsed into expected shape.
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  )
}
