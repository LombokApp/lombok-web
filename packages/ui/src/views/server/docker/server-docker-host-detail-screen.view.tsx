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
import { DataTable } from '@lombokapp/ui-toolkit/components/data-table/data-table'
import { cn } from '@lombokapp/ui-toolkit/utils'
import { formatBytes } from '@lombokapp/utils'
import {
  ArrowLeft,
  Container,
  Layers,
  Link2,
  RefreshCcw,
  Server,
  Trash2,
} from 'lucide-react'
import React from 'react'
import { useNavigate } from 'react-router'

import { DateDisplay } from '@/src/components/date-display'
import { EmptyState } from '@/src/components/empty-state/empty-state'
import { StatCardGroup } from '@/src/components/stat-card-group/stat-card-group'
import { $api, $apiClient } from '@/src/services/api'

import { CreateStandaloneContainerDialog } from './create-standalone-container-dialog'
import type {
  DockerHostConnectionState,
  DockerHostState,
} from './server-docker.types'
import { createContainerTableColumns } from './server-docker-host-containers-table-columns'
import { useListContainers } from './use-list-containers'

// ─── Constants ────────────────────────────────────────────────────────────

const ROW_CLASS =
  'grid grid-cols-1 gap-2 border-b border-muted/30 py-3 last:border-b-0 sm:grid-cols-3'
const LABEL_CLASS =
  'text-xs font-semibold uppercase tracking-wide text-muted-foreground'
const VALUE_CLASS = 'text-sm'

// ─── Helpers ──────────────────────────────────────────────────────────────

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
  const [editContainerId, setEditContainerId] = React.useState<string | null>(
    null,
  )

  // DB-backed host detail
  const hostQuery = $api.useQuery('get', '/api/v1/docker/hosts/{id}', {
    params: { path: { id: hostId } },
  })
  // Runtime state from bridge
  const stateQuery = $api.useQuery('get', '/api/v1/server/docker-hosts/state')
  // Combined container list for this host
  const {
    rows: containerRows,
    isLoading: containersLoading,
    refetch: refetchContainers,
    standaloneRecords,
  } = useListContainers({ hostId })

  const host = hostQuery.data?.result
  const hostState: DockerHostState | undefined = stateQuery.data?.hosts.find(
    (h) => h.id === hostId,
  )
  const runningContainers = containerRows.filter(
    (c) => c.state === 'running',
  ).length

  const isLoading =
    hostQuery.isLoading || stateQuery.isLoading || containersLoading

  const containerCols = React.useMemo(
    () =>
      createContainerTableColumns({
        hostId,
        onEditStandalone: (id) => setEditContainerId(id),
      }),
    [hostId],
  )

  const editContainer = React.useMemo(() => {
    if (!editContainerId) {
      return undefined
    }
    const sc = standaloneRecords.find(
      (r) => r.containerId === editContainerId || r.id === editContainerId,
    )
    if (!sc) {
      return undefined
    }
    return {
      id: sc.id,
      dockerHostId: sc.dockerHostId,
      label: sc.label,
      image: sc.image,
      tag: sc.tag,
      desiredStatus: sc.desiredStatus,
      config: sc.config as Record<string, unknown>,
    }
  }, [editContainerId, standaloneRecords])

  // ─── Delete handler ───────────────────────────────────────────────────

  const handleDelete = React.useCallback(async () => {
    await $apiClient.DELETE('/api/v1/docker/hosts/{id}', {
      params: { path: { id: hostId } },
    })
    void navigate('/server/docker')
  }, [hostId, navigate])

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
              refetchContainers()
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
            label: containerRows.length
              ? `${runningContainers}/${containerRows.length}`
              : '0',
            subtitle: containerRows.length
              ? `${runningContainers} running`
              : 'No containers',
            icon: Container,
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

      {/* Containers */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Container className="size-4 text-muted-foreground" />
            Containers
            <Badge variant={BadgeVariant.outline} className="text-xs">
              {containerRows.length}
            </Badge>
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            All containers managed on this host.
          </p>
        </CardHeader>
        <div className="px-6 pb-6">
          {hostState?.containersError ? (
            <div className="text-sm text-destructive">
              {hostState.containersError}
            </div>
          ) : containerRows.length === 0 ? (
            <div className="rounded-lg border border-muted/40 p-6 text-center text-sm text-muted-foreground italic">
              No containers on this host.
            </div>
          ) : (
            <DataTable
              data={containerRows}
              columns={containerCols}
              rowCount={containerRows.length}
              className="border-muted/40 shadow-sm"
            />
          )}
        </div>
      </Card>

      {editContainer && (
        <CreateStandaloneContainerDialog
          open={!!editContainer}
          onOpenChange={(v) => {
            if (!v) {
              setEditContainerId(null)
            }
          }}
          onCreated={() => {
            setEditContainerId(null)
            refetchContainers()
          }}
          editContainer={editContainer}
        />
      )}
    </div>
  )
}
