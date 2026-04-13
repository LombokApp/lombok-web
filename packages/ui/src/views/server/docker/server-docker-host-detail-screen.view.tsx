import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@lombokapp/ui-toolkit/components/alert-dialog'
import {
  Badge,
  BadgeVariant,
} from '@lombokapp/ui-toolkit/components/badge/badge'
import { Button } from '@lombokapp/ui-toolkit/components/button/button'
import { CardHeader, CardTitle } from '@lombokapp/ui-toolkit/components/card'
import { Card } from '@lombokapp/ui-toolkit/components/card/card'
import type { HideableColumnDef } from '@lombokapp/ui-toolkit/components/data-table/data-table'
import { DataTable } from '@lombokapp/ui-toolkit/components/data-table/data-table'
import { DataTableColumnHeader } from '@lombokapp/ui-toolkit/components/data-table/data-table-column-header'
import { cn } from '@lombokapp/ui-toolkit/utils'
import { formatBytes } from '@lombokapp/utils'
import {
  ArrowLeft,
  Container,
  Layers,
  Link2,
  RefreshCcw,
  Server,
  Settings2,
  Trash2,
} from 'lucide-react'
import React from 'react'
import { useNavigate } from 'react-router'

import { DateDisplay } from '@/src/components/date-display'
import { EmptyState } from '@/src/components/empty-state/empty-state'
import { StatCardGroup } from '@/src/components/stat-card-group/stat-card-group'
import { $api, $apiClient } from '@/src/services/api'

import type {
  DockerHostConnectionState,
  DockerHostState,
} from './server-docker.types'
import { createServerDockerHostContainersTableColumns } from './server-docker-host-containers-table-columns'

// ─── Constants ────────────────────────────────────────────────────────────

const ROW_CLASS =
  'grid grid-cols-1 gap-2 border-b border-muted/30 py-3 last:border-b-0 sm:grid-cols-3'
const LABEL_CLASS =
  'text-xs font-semibold uppercase tracking-wide text-muted-foreground'
const VALUE_CLASS = 'text-sm'

// ─── Resource config row type ─────────────────────────────────────────────

interface ResourceConfigRow {
  id: string
  label: string
  configSummary: string
  createdAt: string
}

// ─── Resource config columns ──────────────────────────────────────────────

const resourceConfigColumns: HideableColumnDef<ResourceConfigRow>[] = [
  {
    accessorKey: 'label',
    header: ({ column }) => (
      <DataTableColumnHeader
        canHide={column.getCanHide()}
        column={column}
        title="Label"
      />
    ),
    cell: ({ row }) => (
      <span className="font-medium">{row.original.label}</span>
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    id: 'configSummary',
    header: ({ column }) => (
      <DataTableColumnHeader
        canHide={column.getCanHide()}
        column={column}
        title="Configuration"
      />
    ),
    cell: ({ row }) => (
      <span className="text-xs text-muted-foreground">
        {row.original.configSummary}
      </span>
    ),
    enableSorting: false,
    enableHiding: true,
  },
  {
    id: 'createdAt',
    header: ({ column }) => (
      <DataTableColumnHeader
        canHide={column.getCanHide()}
        column={column}
        title="Created"
      />
    ),
    cell: ({ row }) => (
      <span className="text-xs">
        <DateDisplay date={row.original.createdAt} showTimeSince={true} />
      </span>
    ),
    enableSorting: false,
    enableHiding: true,
  },
]

// ─── Helpers ──────────────────────────────────────────────────────────────

function summarizeConfig(config: Record<string, unknown>): string {
  const parts: string[] = []
  if (config.gpus) {
    parts.push('GPU')
  }
  if (config.volumes) {
    parts.push('Volumes')
  }
  if (config.networkMode) {
    parts.push(`Net: ${JSON.stringify(config.networkMode)}`)
  }
  if (config.ports) {
    parts.push('Ports')
  }
  if (config.memoryLimit) {
    parts.push(`Mem: ${formatBytes(config.memoryLimit as number)}`)
  }
  if (config.cpuShares) {
    parts.push(`CPU: ${JSON.stringify(config.cpuShares)}`)
  }
  if (config.privileged) {
    parts.push('Privileged')
  }
  if (config.env) {
    parts.push('Env')
  }
  return parts.length > 0 ? parts.join(', ') : 'Default'
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

// ─── Main screen ──────────────────────────────────────────────────────────

export function ServerDockerHostDetailScreen({ hostId }: { hostId: string }) {
  const navigate = useNavigate()

  // New DB-backed host detail
  const hostQuery = $api.useQuery('get', '/api/v1/docker/hosts/{id}', {
    params: { path: { id: hostId } },
  })
  // Runtime state from bridge
  const stateQuery = $api.useQuery('get', '/api/v1/server/docker-hosts/state')
  // Resource configs for this host
  const configsQuery = $api.useQuery('get', '/api/v1/docker/resource-configs', {
    params: { query: { dockerHostId: hostId } },
  })

  const host = hostQuery.data?.result
  const hostState: DockerHostState | undefined = stateQuery.data?.hosts.find(
    (h) => h.id === hostId,
  )
  const containers = hostState?.containers ?? []
  const runningContainers = containers.filter(
    (c) => c.state === 'running',
  ).length

  const resourceConfigs = React.useMemo(
    () => configsQuery.data?.result ?? [],
    [configsQuery.data?.result],
  )

  const isLoading = hostQuery.isLoading || stateQuery.isLoading

  // ─── Delete handler ───────────────────────────────────────────────────

  const handleDelete = React.useCallback(async () => {
    await $apiClient.DELETE('/api/v1/docker/hosts/{id}', {
      params: { path: { id: hostId } },
    })
    void navigate('/server/docker')
  }, [hostId, navigate])

  // ─── Resource config rows ─────────────────────────────────────────────

  const configRows = React.useMemo<ResourceConfigRow[]>(
    () =>
      resourceConfigs.map((cfg) => ({
        id: cfg.id,
        label: cfg.label,
        configSummary: summarizeConfig(cfg.config as Record<string, unknown>),
        createdAt: cfg.createdAt,
      })),
    [resourceConfigs],
  )

  // ─── Error state ──────────────────────────────────────────────────────

  if (hostQuery.isError) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-destructive">
        Failed to load docker host.
      </div>
    )
  }

  if (!host && !hostQuery.isLoading) {
    return (
      <EmptyState text="Docker host not found" icon={Server} variant="row" />
    )
  }

  if (!host) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
        Loading docker host...
      </div>
    )
  }

  // ─── Render ───────────────────────────────────────────────────────────

  return (
    <div className="flex size-full flex-1 flex-col gap-6 overflow-y-auto pb-6">
      {/* Header */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="size-8 p-0"
              onClick={() => void navigate('/server/docker')}
            >
              <ArrowLeft className="size-4" />
            </Button>
            <h1 className="text-2xl font-semibold">{host.label}</h1>
            {renderConnectionBadge(hostState?.connection)}
            {host.isDefault && (
              <Badge variant={BadgeVariant.secondary} className="text-xs">
                default
              </Badge>
            )}
            {!host.enabled && (
              <Badge variant={BadgeVariant.outline} className="text-xs">
                disabled
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">{host.host}</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={isLoading}
            onClick={() => {
              void hostQuery.refetch()
              void stateQuery.refetch()
              void configsQuery.refetch()
            }}
          >
            <RefreshCcw className="mr-2 size-4" />
            Refresh
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Trash2 className="mr-2 size-4" />
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Docker Host</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete{' '}
                  <span className="font-medium">{host.label}</span>? This cannot
                  be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={() => void handleDelete()}
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Stats */}
      <StatCardGroup
        stats={[
          {
            title: 'Status',
            label: hostState?.connection.success ? 'Connected' : 'Offline',
            subtitle: hostState?.connection.version
              ? `Docker ${hostState.connection.version}`
              : 'No connection data',
            icon: Server,
          },
          {
            title: 'Containers',
            label: containers.length
              ? `${runningContainers}/${containers.length}`
              : '0',
            subtitle: containers.length
              ? `${runningContainers} running`
              : 'No containers',
            icon: Container,
          },
          {
            title: 'Resource Configs',
            label: String(resourceConfigs.length),
            subtitle: `${resourceConfigs.length} template${resourceConfigs.length === 1 ? '' : 's'}`,
            icon: Settings2,
          },
          {
            title: 'Memory',
            label:
              hostState?.resources?.memoryBytes !== undefined
                ? formatBytes(hostState.resources.memoryBytes)
                : '—',
            subtitle:
              hostState?.resources?.cpuCores !== undefined
                ? `${hostState.resources.cpuCores} CPU cores`
                : 'Unknown resources',
            icon: Layers,
          },
        ]}
      />

      {/* Connection + Host Info */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Link2 className="size-4 text-muted-foreground" />
                Connection
              </CardTitle>
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
              <CardTitle className="flex items-center gap-2 text-lg">
                <Server className="size-4 text-muted-foreground" />
                Host Configuration
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Stored settings and endpoint details.
              </p>
            </div>
            <Badge variant={BadgeVariant.outline} className="text-xs uppercase">
              {host.type.replace('_', ' ')}
            </Badge>
          </CardHeader>
          <div className="space-y-0 px-6 pb-6">
            <div className={ROW_CLASS}>
              <div className={LABEL_CLASS}>Endpoint</div>
              <div className={cn(VALUE_CLASS, 'col-span-2 font-mono text-xs')}>
                {host.host}
              </div>
            </div>
            <div className={ROW_CLASS}>
              <div className={LABEL_CLASS}>Health Status</div>
              <div className={VALUE_CLASS}>
                <Badge
                  variant={
                    host.healthStatus === 'healthy'
                      ? BadgeVariant.secondary
                      : host.healthStatus === 'unhealthy'
                        ? BadgeVariant.destructive
                        : BadgeVariant.outline
                  }
                  className="text-xs capitalize"
                >
                  {host.healthStatus}
                </Badge>
              </div>
            </div>
            <div className={ROW_CLASS}>
              <div className={LABEL_CLASS}>Last Health Check</div>
              <div className={VALUE_CLASS}>
                {host.lastHealthCheck ? (
                  <DateDisplay
                    date={host.lastHealthCheck}
                    showTimeSince={true}
                  />
                ) : (
                  <span className="italic opacity-50">Never</span>
                )}
              </div>
            </div>
            <div className={ROW_CLASS}>
              <div className={LABEL_CLASS}>TLS</div>
              <div className={VALUE_CLASS}>
                {host.tlsConfig ? (
                  <Badge variant={BadgeVariant.secondary} className="text-xs">
                    Configured
                  </Badge>
                ) : (
                  <span className="italic opacity-50">None</span>
                )}
              </div>
            </div>
            <div className={ROW_CLASS}>
              <div className={LABEL_CLASS}>Created</div>
              <div className={VALUE_CLASS}>
                <DateDisplay date={host.createdAt} showTimeSince={true} />
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Resource Configs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Settings2 className="size-4 text-muted-foreground" />
            Resource Configs
            <Badge variant={BadgeVariant.outline} className="text-xs">
              {resourceConfigs.length}
            </Badge>
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Container resource templates assigned to this host.
          </p>
        </CardHeader>
        <div className="px-6 pb-6">
          {configRows.length === 0 ? (
            <div className="rounded-lg border border-muted/40 p-6 text-center text-sm text-muted-foreground italic">
              No resource configs for this host.
            </div>
          ) : (
            <DataTable
              data={configRows}
              columns={resourceConfigColumns}
              rowCount={configRows.length}
              className="border-muted/40 shadow-sm"
            />
          )}
        </div>
      </Card>

      {/* Containers */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Container className="size-4 text-muted-foreground" />
            Platform Containers
            <Badge variant={BadgeVariant.outline} className="text-xs">
              {containers.length}
            </Badge>
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Live containers running on this host.
          </p>
        </CardHeader>
        <div className="px-6 pb-6">
          {hostState?.containersError ? (
            <div className="text-sm text-destructive">
              {hostState.containersError}
            </div>
          ) : containers.length === 0 ? (
            <div className="rounded-lg border border-muted/40 p-6 text-center text-sm text-muted-foreground italic">
              No containers running on this host.
            </div>
          ) : (
            <DataTable
              data={containers}
              columns={createServerDockerHostContainersTableColumns(hostId)}
              rowCount={containers.length}
              className="border-muted/40 shadow-sm"
            />
          )}
        </div>
      </Card>
    </div>
  )
}
