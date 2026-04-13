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
import {
  Container,
  Cpu,
  Link2,
  Play,
  Plus,
  RefreshCcw,
  Server,
  Settings2,
  Trash2,
} from 'lucide-react'
import React from 'react'

import { DockerIcon } from '@/src/components/icons/docker-icon'
import { StatCardGroup } from '@/src/components/stat-card-group/stat-card-group'
import { TableLinkColumn } from '@/src/components/table-link-column/table-link-column'
import { $api, $apiClient } from '@/src/services/api'

import { CreateDockerHostDialog } from './create-docker-host-dialog'
import { ProfileAssignmentDialog } from './profile-assignment-dialog'
import type {
  DockerHostConnectionState,
  DockerHostContainerState,
} from './server-docker.types'

// ─── Types ─────────────────────────────────────────────────────────────────

interface HostRow {
  id: string
  label: string
  host: string
  type: string
  isDefault: boolean
  enabled: boolean
  healthStatus: string
  connection?: DockerHostConnectionState
  containerCount: number
  runningContainerCount: number
}

interface ContainerRow extends DockerHostContainerState {
  hostId: string
  hostLabel: string
}

interface ProfileRow {
  appIdentifier: string
  appLabel: string
  appEnabled: boolean
  profileKey: string
  image: string
  assignedHostLabel: string | null
  assignmentId: string | null
  assignedHostId: string | null
}

// ─── Host columns ──────────────────────────────────────────────────────────

const createHostColumns = (
  onDelete: (host: HostRow) => void,
): HideableColumnDef<HostRow>[] => [
  {
    id: 'link',
    cell: ({ row }) => (
      <TableLinkColumn to={`/server/docker/${row.original.id}`} />
    ),
    enableSorting: false,
    zeroWidth: true,
  },
  {
    accessorKey: 'label',
    header: ({ column }) => (
      <DataTableColumnHeader
        canHide={column.getCanHide()}
        column={column}
        title="Host"
      />
    ),
    cell: ({ row }) => (
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="font-medium">{row.original.label}</span>
          {row.original.isDefault && (
            <Badge variant={BadgeVariant.secondary} className="text-xs">
              default
            </Badge>
          )}
          {!row.original.enabled && (
            <Badge variant={BadgeVariant.outline} className="text-xs">
              disabled
            </Badge>
          )}
        </div>
        <span className="text-xs text-muted-foreground">
          {row.original.host}
        </span>
      </div>
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    id: 'connection',
    header: ({ column }) => (
      <DataTableColumnHeader
        canHide={column.getCanHide()}
        column={column}
        title="Status"
      />
    ),
    cell: ({ row }) => {
      const conn = row.original.connection
      if (!conn) {
        return (
          <Badge variant={BadgeVariant.outline} className="text-xs">
            {row.original.healthStatus === 'unknown'
              ? 'Unknown'
              : row.original.healthStatus}
          </Badge>
        )
      }
      return (
        <div className="flex flex-col gap-1">
          <Badge
            variant={
              conn.success ? BadgeVariant.secondary : BadgeVariant.destructive
            }
            className="text-xs"
          >
            {conn.success ? 'Connected' : 'Offline'}
          </Badge>
          {conn.success && conn.version && (
            <span className="text-xs text-muted-foreground">
              {conn.version}
            </span>
          )}
        </div>
      )
    },
    enableSorting: false,
    enableHiding: true,
  },
  {
    id: 'containers',
    header: ({ column }) => (
      <DataTableColumnHeader
        canHide={column.getCanHide()}
        column={column}
        title="Containers"
      />
    ),
    cell: ({ row }) => {
      const { containerCount, runningContainerCount } = row.original
      const ratio = containerCount ? runningContainerCount / containerCount : 0
      return (
        <div className="flex min-w-[100px] flex-col gap-1">
          <span
            className={cn(
              'text-xs font-medium',
              !containerCount && 'italic opacity-50',
            )}
          >
            {containerCount
              ? `${runningContainerCount}/${containerCount} running`
              : '0'}
          </span>
          <div className="h-1.5 w-full rounded-full bg-muted/40">
            <div
              className={cn(
                'h-full rounded-full',
                ratio > 0 ? 'bg-primary/70' : 'bg-muted/30',
              )}
              style={{ width: `${Math.round(ratio * 100)}%` }}
            />
          </div>
        </div>
      )
    },
    enableSorting: false,
    enableHiding: true,
  },
  {
    id: 'actions',
    cell: ({ row }) => (
      <div className="relative z-20 flex justify-end px-4">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="sm" className="size-8 p-0">
              <Trash2 className="size-4 text-muted-foreground" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Docker Host</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete{' '}
                <span className="font-medium">{row.original.label}</span>? This
                cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => onDelete(row.original)}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    ),
    enableSorting: false,
    enableHiding: false,
    zeroWidth: true,
  },
]

// ─── Container columns ─────────────────────────────────────────────────────

const containerColumns: HideableColumnDef<ContainerRow>[] = [
  {
    id: 'link',
    cell: ({ row }) => (
      <TableLinkColumn
        to={`/server/docker/${row.original.hostId}/containers/${row.original.id}`}
      />
    ),
    enableSorting: false,
    zeroWidth: true,
  },
  {
    accessorKey: 'id',
    header: ({ column }) => (
      <DataTableColumnHeader
        canHide={column.getCanHide()}
        column={column}
        title="Container"
      />
    ),
    cell: ({ row }) => (
      <div className="flex flex-col gap-1">
        <span className="font-mono text-xs" title={row.original.id}>
          {row.original.id.slice(0, 12)}
        </span>
        <span className="text-xs text-muted-foreground">
          {row.original.hostLabel}
        </span>
      </div>
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: 'image',
    header: ({ column }) => (
      <DataTableColumnHeader
        canHide={column.getCanHide()}
        column={column}
        title="Image"
      />
    ),
    cell: ({ row }) => (
      <span
        className="max-w-72 truncate text-sm text-muted-foreground"
        title={row.original.image}
      >
        {row.original.image}
      </span>
    ),
    enableSorting: false,
    enableHiding: true,
  },
  {
    id: 'profileId',
    header: ({ column }) => (
      <DataTableColumnHeader
        canHide={column.getCanHide()}
        column={column}
        title="Profile"
      />
    ),
    cell: ({ row }) =>
      row.original.profileId ? (
        <Badge variant={BadgeVariant.outline} className="text-xs">
          {row.original.profileId}
        </Badge>
      ) : (
        <span className="italic opacity-50">—</span>
      ),
    enableSorting: false,
    enableHiding: true,
  },
  {
    id: 'state',
    header: ({ column }) => (
      <DataTableColumnHeader
        canHide={column.getCanHide()}
        column={column}
        title="State"
      />
    ),
    cell: ({ row }) => {
      const s = row.original.state
      const variant =
        s === 'running'
          ? BadgeVariant.secondary
          : s === 'exited'
            ? BadgeVariant.destructive
            : BadgeVariant.outline
      return (
        <Badge variant={variant} className="text-xs capitalize">
          {s}
        </Badge>
      )
    },
    enableSorting: false,
    enableHiding: true,
  },
]

// ─── Profile columns ───────────────────────────────────────────────────────

const createProfileColumns = (
  onConfigure: (row: ProfileRow) => void,
): HideableColumnDef<ProfileRow>[] => [
  {
    id: 'link',
    cell: ({ row }) => (
      <TableLinkColumn to={`/server/apps/${row.original.appIdentifier}`} />
    ),
    enableSorting: false,
    zeroWidth: true,
  },
  {
    id: 'app',
    header: ({ column }) => (
      <DataTableColumnHeader
        canHide={column.getCanHide()}
        column={column}
        title="App"
      />
    ),
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <span className="font-medium">{row.original.appLabel}</span>
        {!row.original.appEnabled && (
          <Badge variant={BadgeVariant.outline} className="text-xs">
            disabled
          </Badge>
        )}
      </div>
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: 'profileKey',
    header: ({ column }) => (
      <DataTableColumnHeader
        canHide={column.getCanHide()}
        column={column}
        title="Profile"
      />
    ),
    cell: ({ row }) => (
      <Badge variant={BadgeVariant.outline} className="text-xs">
        {row.original.profileKey}
      </Badge>
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: 'image',
    header: ({ column }) => (
      <DataTableColumnHeader
        canHide={column.getCanHide()}
        column={column}
        title="Image"
      />
    ),
    cell: ({ row }) => (
      <span
        className="max-w-72 truncate text-sm text-muted-foreground"
        title={row.original.image}
      >
        {row.original.image}
      </span>
    ),
    enableSorting: false,
    enableHiding: true,
  },
  {
    id: 'assignedHost',
    header: ({ column }) => (
      <DataTableColumnHeader
        canHide={column.getCanHide()}
        column={column}
        title="Host"
      />
    ),
    cell: ({ row }) =>
      row.original.assignedHostLabel ? (
        <span className="text-xs">{row.original.assignedHostLabel}</span>
      ) : (
        <span className="text-xs italic opacity-50">default</span>
      ),
    enableSorting: false,
    enableHiding: true,
  },
  {
    id: 'actions',
    cell: ({ row }) => (
      <div className="relative z-20 justify-end">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs"
          onClick={() => onConfigure(row.original)}
        >
          <Settings2 className="mr-1.5 size-3" />
          Configure
        </Button>
      </div>
    ),
    enableSorting: false,
    enableHiding: false,
  },
]

// ─── Section header ────────────────────────────────────────────────────────

// ─── Main screen ───────────────────────────────────────────────────────────

export function ServerDockerScreen() {
  const [createHostOpen, setCreateHostOpen] = React.useState(false)

  // Managed hosts (DB-backed)
  const hostsQuery = $api.useQuery('get', '/api/v1/docker/hosts')
  // Runtime state from bridge
  const stateQuery = $api.useQuery('get', '/api/v1/server/docker-hosts/state')
  // Profile assignments
  const assignmentsQuery = $api.useQuery(
    'get',
    '/api/v1/docker/profile-assignments',
  )
  // Apps (for container profiles)
  const appsQuery = $api.useQuery('get', '/api/v1/server/apps')

  const isLoading =
    hostsQuery.isLoading ||
    stateQuery.isLoading ||
    assignmentsQuery.isLoading ||
    appsQuery.isLoading

  // ─── Derive host rows ──────────────────────────────────────────────────

  const hostRows = React.useMemo<HostRow[]>(() => {
    const hosts = hostsQuery.data?.result ?? []
    const hostStateMap = new Map(
      (stateQuery.data?.hosts ?? []).map((h) => [h.id, h]),
    )

    return hosts.map((host) => {
      const state = hostStateMap.get(host.id)
      const containers = state?.containers ?? []
      return {
        id: host.id,
        label: host.label,
        host: host.host,
        type: host.type,
        isDefault: host.isDefault,
        enabled: host.enabled,
        healthStatus: host.healthStatus,
        connection: state?.connection,
        containerCount: containers.length,
        runningContainerCount: containers.filter((c) => c.state === 'running')
          .length,
      }
    })
  }, [hostsQuery.data, stateQuery.data])

  // ─── Derive container rows ─────────────────────────────────────────────

  const containerRows = React.useMemo<ContainerRow[]>(() => {
    const hosts = hostsQuery.data?.result ?? []
    const hostIdToLabel = new Map(hosts.map((h) => [h.id, h.label]))
    const stateHosts = stateQuery.data?.hosts ?? []

    return stateHosts.flatMap((hostState) =>
      hostState.containers.map((container) => ({
        ...container,
        hostId: hostState.id,
        hostLabel: hostIdToLabel.get(hostState.id) ?? hostState.id,
      })),
    )
  }, [hostsQuery.data, stateQuery.data])

  // ─── Derive profile rows ──────────────────────────────────────────────

  const profileRows = React.useMemo<ProfileRow[]>(() => {
    const apps = appsQuery.data?.result ?? []
    const hosts = hostsQuery.data?.result ?? []
    const assignments = assignmentsQuery.data?.result ?? []

    const hostLabelMap = new Map(hosts.map((h) => [h.id, h.label]))

    const assignmentMap = new Map(
      assignments.map((a) => [`${a.appIdentifier}:${a.profileKey}`, a]),
    )

    return apps.flatMap((app) => {
      const profiles = app.config.containerProfiles
        ? Object.entries(app.config.containerProfiles)
        : []
      return profiles.map(([profileKey, profile]) => {
        const assignment = assignmentMap.get(`${app.identifier}:${profileKey}`)

        return {
          appIdentifier: app.identifier,
          appLabel: app.label,
          appEnabled: app.enabled,
          profileKey,
          image: profile.image,
          assignedHostLabel: assignment
            ? (hostLabelMap.get(assignment.dockerHostId) ?? 'Unknown')
            : null,
          assignmentId: assignment?.id ?? null,
          assignedHostId: assignment?.dockerHostId ?? null,
        }
      })
    })
  }, [appsQuery.data, hostsQuery.data, assignmentsQuery.data])

  // ─── Delete handler ─────────────────────────────────────────────────────

  const handleDeleteHost = React.useCallback(
    async (host: HostRow) => {
      await $apiClient.DELETE('/api/v1/docker/hosts/{id}', {
        params: { path: { id: host.id } },
      })
      void hostsQuery.refetch()
    },
    [hostsQuery],
  )

  const hostCols = React.useMemo(
    () => createHostColumns((host) => void handleDeleteHost(host)),
    [handleDeleteHost],
  )

  // ─── Profile assignment dialog ─────────────────────────────────────────

  const [configureProfile, setConfigureProfile] =
    React.useState<ProfileRow | null>(null)

  const profileCols = React.useMemo(
    () => createProfileColumns((row) => setConfigureProfile(row)),
    [],
  )

  const handleProfileSaved = React.useCallback(() => {
    void assignmentsQuery.refetch()
  }, [assignmentsQuery])

  // ─── Stats ─────────────────────────────────────────────────────────────

  const connectedHosts = hostRows.filter((h) => h.connection?.success).length
  const totalContainers = containerRows.length
  const runningContainers = containerRows.filter(
    (c) => c.state === 'running',
  ).length

  // ─── Error state ───────────────────────────────────────────────────────

  if (hostsQuery.isError) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-destructive">
        Failed to load docker host configuration.
      </div>
    )
  }

  // ─── Render ────────────────────────────────────────────────────────────

  return (
    <div className={cn('flex h-full flex-1 flex-col gap-6')}>
      {/* Header */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Docker</h1>
          <p className="text-sm text-muted-foreground">
            Manage docker hosts, containers, and app container profiles.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={isLoading}
            onClick={() => {
              void hostsQuery.refetch()
              void stateQuery.refetch()
              void assignmentsQuery.refetch()
            }}
          >
            <RefreshCcw className="mr-2 size-4" />
            Refresh
          </Button>
          <Button size="sm" onClick={() => setCreateHostOpen(true)}>
            <Plus className="mr-2 size-4" />
            Add Host
          </Button>
        </div>
      </div>

      {/* Stats */}
      <StatCardGroup
        stats={[
          {
            title: 'Hosts',
            label: isLoading ? '—' : String(hostRows.length),
            subtitle: `${connectedHosts} connected`,
            icon: Server,
          },
          {
            title: 'Connected',
            label: isLoading ? '—' : `${connectedHosts}/${hostRows.length}`,
            subtitle:
              hostRows.length > 0
                ? `${Math.round((connectedHosts / hostRows.length) * 100)}% online`
                : 'No hosts',
            icon: Link2,
          },
          {
            title: 'Containers',
            label: isLoading ? '—' : String(totalContainers),
            subtitle: `Across ${hostRows.length} host${hostRows.length === 1 ? '' : 's'}`,
            icon: Container,
          },
          {
            title: 'Running',
            label: isLoading ? '—' : String(runningContainers),
            subtitle:
              totalContainers > 0
                ? `${totalContainers - runningContainers} stopped`
                : 'No containers',
            icon: Play,
          },
        ]}
      />

      {/* Hosts */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <Server className="size-4 text-muted-foreground" />
            <h2 className="text-lg font-semibold">Hosts</h2>
            <Badge variant={BadgeVariant.secondary} className="text-xs">
              {hostRows.length}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Docker endpoints available for running containers.
          </p>
        </div>
        {hostRows.length === 0 && !isLoading ? (
          <div className="w-full rounded-xl border border-border/50 bg-card px-16 py-14 shadow-sm">
            <div className="flex flex-col items-center gap-4 text-center">
              <DockerIcon className="size-20 text-muted-foreground/40" />
              <div className="flex flex-col gap-1">
                <p className="text-sm font-medium">
                  No docker hosts configured
                </p>
                <p className="max-w-xs text-sm text-muted-foreground">
                  Add a local Docker socket or a remote endpoint to get started.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCreateHostOpen(true)}
              >
                Add a Docker Host
              </Button>
            </div>
          </div>
        ) : (
          <DataTable
            data={hostRows}
            columns={hostCols}
            rowCount={hostRows.length}
            className="border-muted/40 shadow-sm"
          />
        )}
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
            Live containers running across all hosts.
          </p>
        </CardHeader>
        <div className="px-6 pb-6">
          {containerRows.length === 0 && !isLoading ? (
            <div className="rounded-lg border border-muted/40 p-6 text-center text-sm text-muted-foreground italic">
              No containers running on any host.
            </div>
          ) : (
            <DataTable
              data={containerRows}
              columns={containerColumns}
              rowCount={containerRows.length}
              className="border-muted/40 shadow-sm"
            />
          )}
        </div>
      </Card>

      {/* App Container Profiles */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Cpu className="size-4 text-muted-foreground" />
            App Container Profiles
            <Badge variant={BadgeVariant.outline} className="text-xs">
              {profileRows.length}
            </Badge>
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Installed apps with Docker container profiles.
          </p>
        </CardHeader>
        <div className="px-6 pb-6">
          {profileRows.length === 0 && !isLoading ? (
            <div className="rounded-lg border border-muted/40 p-6 text-center text-sm text-muted-foreground italic">
              No apps with container profiles installed.
            </div>
          ) : (
            <DataTable
              data={profileRows}
              columns={profileCols}
              rowCount={profileRows.length}
              className="border-muted/40 shadow-sm"
            />
          )}
        </div>
      </Card>

      <CreateDockerHostDialog
        open={createHostOpen}
        onOpenChange={setCreateHostOpen}
        onCreated={() => void hostsQuery.refetch()}
      />

      {configureProfile && (
        <ProfileAssignmentDialog
          open={!!configureProfile}
          onOpenChange={(v) => {
            if (!v) {
              setConfigureProfile(null)
            }
          }}
          appIdentifier={configureProfile.appIdentifier}
          appLabel={configureProfile.appLabel}
          profileKey={configureProfile.profileKey}
          image={configureProfile.image}
          assignmentId={configureProfile.assignmentId}
          currentHostId={configureProfile.assignedHostId}
          onSaved={handleProfileSaved}
        />
      )}
    </div>
  )
}
