import {
  Badge,
  BadgeVariant,
} from '@lombokapp/ui-toolkit/components/badge/badge'
import { CardHeader, CardTitle } from '@lombokapp/ui-toolkit/components/card'
import { Card } from '@lombokapp/ui-toolkit/components/card/card'
import { DataTable } from '@lombokapp/ui-toolkit/components/data-table/data-table'
import { cn } from '@lombokapp/ui-toolkit/utils'
import { formatBytes } from '@lombokapp/utils'
import { Server } from 'lucide-react'

import { EmptyState } from '@/src/components/empty-state/empty-state'
import { $api } from '@/src/services/api'

import type {
  DockerHostConfigSummary,
  DockerHostConnectionState,
  DockerHostState,
} from './server-docker.types'
import { createServerDockerHostContainersTableColumns } from './server-docker-host-containers-table-columns'

const ROW_CLASS =
  'grid grid-cols-1 gap-2 border-b border-muted/30 py-3 last:border-b-0 sm:grid-cols-3'
const LABEL_CLASS =
  'text-xs font-semibold uppercase tracking-wide text-muted-foreground'
const VALUE_CLASS = 'text-sm'

const renderInlineList = (items: string[], emptyLabel = 'None') => {
  if (!items.length) {
    return <span className="italic opacity-50">{emptyLabel}</span>
  }

  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <Badge
          key={item}
          variant={BadgeVariant.outline}
          className="truncate text-xs"
        >
          {item}
        </Badge>
      ))}
    </div>
  )
}

const renderProfileOverrides = <T,>(
  overrides: Record<string, T> | undefined,
  formatValue: (value: T) => string,
) => {
  if (!overrides || Object.keys(overrides).length === 0) {
    return <span className="italic opacity-50">None</span>
  }

  return (
    <div className="flex flex-col gap-2">
      {Object.entries(overrides).map(([profileKey, value]) => (
        <div key={profileKey} className="truncate text-xs">
          <span className="font-medium">{profileKey}</span>
          <span className="text-muted-foreground"> — {formatValue(value)}</span>
        </div>
      ))}
    </div>
  )
}

const renderConnectionBadge = (connection?: DockerHostConnectionState) => {
  if (!connection) {
    return <Badge variant={BadgeVariant.outline}>Unknown</Badge>
  }

  return (
    <Badge
      variant={
        connection.success ? BadgeVariant.secondary : BadgeVariant.destructive
      }
      className="text-xs"
    >
      {connection.success ? 'Connected' : 'Offline'}
    </Badge>
  )
}

const renderConnectionValue = (
  connection: DockerHostConnectionState | undefined,
  value: 'version' | 'apiVersion' | 'error',
) => {
  if (!connection) {
    return <span className="italic opacity-50">Unknown</span>
  }
  if (value === 'error') {
    return connection.error ? (
      <span className="text-xs text-destructive">{connection.error}</span>
    ) : (
      <span className="italic opacity-50">None</span>
    )
  }
  return connection[value] ? (
    <span>{connection[value]}</span>
  ) : (
    <span className="italic opacity-50">Unknown</span>
  )
}

export function ServerDockerHostDetailScreen({ hostId }: { hostId: string }) {
  const configQuery = $api.useQuery('get', '/api/v1/server/docker-hosts')
  const stateQuery = $api.useQuery('get', '/api/v1/server/docker-hosts/state')

  const hostConfig: DockerHostConfigSummary | undefined =
    configQuery.data?.hosts.find((host) => host.id === hostId)
  const hostState: DockerHostState | undefined = stateQuery.data?.hosts.find(
    (host) => host.id === hostId,
  )
  const containers = hostState?.containers ?? []
  const runningContainers = containers.filter(
    (container) => container.state === 'running',
  ).length

  if (configQuery.isError) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-destructive">
        Failed to load docker host configuration.
      </div>
    )
  }

  if (!hostConfig && !configQuery.isLoading) {
    return (
      <EmptyState text="Docker host not found" icon={Server} variant="row" />
    )
  }

  if (!hostConfig) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
        Loading docker host...
      </div>
    )
  }

  return (
    <div className="flex size-full flex-1 flex-col gap-6 overflow-y-auto pb-6">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold tracking-tight">{hostConfig.id}</h1>
          {renderConnectionBadge(hostState?.connection)}
        </div>
        <p className="text-muted-foreground">{hostConfig.host}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-lg border border-muted/40 bg-muted/10 p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Containers
          </div>
          <div className="mt-2 text-2xl font-semibold">
            {containers.length
              ? `${runningContainers}/${containers.length}`
              : '0'}
          </div>
          <div className="text-xs text-muted-foreground">Running</div>
        </div>
        <div className="rounded-lg border border-muted/40 bg-muted/10 p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Assigned Profiles
          </div>
          <div className="mt-2 text-2xl font-semibold">
            {hostConfig.assignedProfiles.length}
          </div>
          <div className="text-xs text-muted-foreground">Total</div>
        </div>
        <div className="rounded-lg border border-muted/40 bg-muted/10 p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            CPU Cores
          </div>
          <div className="mt-2 text-2xl font-semibold">
            {hostState?.resources?.cpuCores !== undefined
              ? hostState.resources.cpuCores
              : '—'}
          </div>
          <div className="text-xs text-muted-foreground">Available</div>
        </div>
        <div className="rounded-lg border border-muted/40 bg-muted/10 p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Memory
          </div>
          <div className="mt-2 text-2xl font-semibold">
            {hostState?.resources?.memoryBytes !== undefined
              ? formatBytes(hostState.resources.memoryBytes)
              : '—'}
          </div>
          <div className="text-xs text-muted-foreground">Available</div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div className="space-y-1">
              <CardTitle className="text-lg">Connection</CardTitle>
              <p className="text-sm text-muted-foreground">
                Live status and daemon metadata.
              </p>
            </div>
            {renderConnectionBadge(hostState?.connection)}
          </CardHeader>
          <div className="space-y-0 px-6 pb-6">
            <div className={ROW_CLASS}>
              <div className={LABEL_CLASS}>Description</div>
              <div className={cn(VALUE_CLASS, 'col-span-2')}>
                {hostState?.description ?? (
                  <span className="italic opacity-50">Unknown</span>
                )}
              </div>
            </div>
            <div className={ROW_CLASS}>
              <div className={LABEL_CLASS}>Docker Version</div>
              <div className={VALUE_CLASS}>
                {renderConnectionValue(hostState?.connection, 'version')}
              </div>
            </div>
            <div className={ROW_CLASS}>
              <div className={LABEL_CLASS}>API Version</div>
              <div className={VALUE_CLASS}>
                {renderConnectionValue(hostState?.connection, 'apiVersion')}
              </div>
            </div>
            <div className={ROW_CLASS}>
              <div className={LABEL_CLASS}>Error</div>
              <div className={cn(VALUE_CLASS, 'col-span-2')}>
                {renderConnectionValue(hostState?.connection, 'error')}
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div className="space-y-1">
              <CardTitle className="text-lg">Host Configuration</CardTitle>
              <p className="text-sm text-muted-foreground">
                Assigned profiles and per-profile overrides.
              </p>
            </div>
            <Badge variant={BadgeVariant.outline} className="text-xs uppercase">
              {hostConfig.type}
            </Badge>
          </CardHeader>
          <div className="space-y-0 px-6 pb-6">
            <div className={ROW_CLASS}>
              <div className={LABEL_CLASS}>Assigned Profiles</div>
              <div className={cn(VALUE_CLASS, 'col-span-2')}>
                {renderInlineList(hostConfig.assignedProfiles)}
              </div>
            </div>
            <div className={ROW_CLASS}>
              <div className={LABEL_CLASS}>Network Modes</div>
              <div className={cn(VALUE_CLASS, 'col-span-2')}>
                {renderProfileOverrides(
                  hostConfig.networkMode,
                  (value) => value,
                )}
              </div>
            </div>
            <div className={ROW_CLASS}>
              <div className={LABEL_CLASS}>Volumes</div>
              <div className={cn(VALUE_CLASS, 'col-span-2')}>
                {renderProfileOverrides(hostConfig.volumes, (value) =>
                  value.length ? value.join(', ') : 'None',
                )}
              </div>
            </div>
            <div className={ROW_CLASS}>
              <div className={LABEL_CLASS}>Extra Hosts</div>
              <div className={cn(VALUE_CLASS, 'col-span-2')}>
                {renderProfileOverrides(hostConfig.extraHosts, (value) =>
                  value.length ? value.join(', ') : 'None',
                )}
              </div>
            </div>
            <div className={ROW_CLASS}>
              <div className={LABEL_CLASS}>GPU Assignments</div>
              <div className={cn(VALUE_CLASS, 'col-span-2')}>
                {renderProfileOverrides(hostConfig.gpus, (value) =>
                  value.deviceIds.length
                    ? `${value.driver}: ${value.deviceIds.join(', ')}`
                    : value.driver,
                )}
              </div>
            </div>
            <div className={ROW_CLASS}>
              <div className={LABEL_CLASS}>Env Var Keys</div>
              <div className={cn(VALUE_CLASS, 'col-span-2')}>
                {renderProfileOverrides(
                  hostConfig.environmentVariableKeys,
                  (value) => (value.length ? value.join(', ') : 'None'),
                )}
              </div>
            </div>
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Host Resources</CardTitle>
        </CardHeader>
        <div className="grid gap-4 px-6 pb-6 sm:grid-cols-2">
          <div className="rounded-md border border-muted/30 bg-muted/10 p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              CPU Cores
            </div>
            <div className="mt-2 text-2xl font-semibold">
              {hostState?.resources?.cpuCores !== undefined ? (
                hostState.resources.cpuCores
              ) : (
                <span className="italic opacity-50">Unknown</span>
              )}
            </div>
          </div>
          <div className="rounded-md border border-muted/30 bg-muted/10 p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Memory
            </div>
            <div className="mt-2 text-2xl font-semibold">
              {hostState?.resources?.memoryBytes !== undefined ? (
                formatBytes(hostState.resources.memoryBytes)
              ) : (
                <span className="italic opacity-50">Unknown</span>
              )}
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <CardTitle className="text-lg">Platform Containers</CardTitle>
          <Badge variant={BadgeVariant.outline} className="text-xs">
            {containers.length}
          </Badge>
        </CardHeader>
        <div className="px-6 pb-6">
          {hostState?.containersError ? (
            <div className="text-sm text-destructive">
              {hostState.containersError}
            </div>
          ) : (
            <DataTable
              data={hostState?.containers ?? []}
              columns={createServerDockerHostContainersTableColumns(
                hostConfig.id,
              )}
              rowCount={hostState?.containers.length ?? 0}
              hideHeader={false}
              className="border-muted/40 shadow-sm"
            />
          )}
        </div>
      </Card>
    </div>
  )
}
