import {
  Badge,
  BadgeVariant,
} from '@lombokapp/ui-toolkit/components/badge/badge'
import { Button } from '@lombokapp/ui-toolkit/components/button/button'
import { DataTable } from '@lombokapp/ui-toolkit/components/data-table/data-table'
import { cn } from '@lombokapp/ui-toolkit/utils'
import { RefreshCcw, Server } from 'lucide-react'
import React from 'react'

import { EmptyState } from '@/src/components/empty-state/empty-state'
import { $api } from '@/src/services/api'

import { serverDockerHostsTableColumns } from './server-docker-hosts-table-columns'

export function ServerDockerScreen() {
  const configQuery = $api.useQuery('get', '/api/v1/server/docker-hosts')
  const stateQuery = $api.useQuery('get', '/api/v1/server/docker-hosts/state')

  const hostRows = React.useMemo(() => {
    const hosts = configQuery.data?.hosts ?? []
    const hostStateMap = new Map(
      (stateQuery.data?.hosts ?? []).map((host) => [host.id, host]),
    )

    return hosts.map((host) => {
      const hostState = hostStateMap.get(host.id)
      return {
        ...host,
        connection: hostState?.connection,
        containers: hostState?.containers ?? [],
        containersError: hostState?.containersError,
      }
    })
  }, [configQuery.data, stateQuery.data])
  const isLoading = configQuery.isLoading || stateQuery.isLoading
  const connectedHosts = hostRows.filter(
    (host) => host.connection?.success,
  ).length
  const totalContainers = hostRows.reduce(
    (sum, host) => sum + host.containers.length,
    0,
  )
  const runningContainers = hostRows.reduce(
    (sum, host) =>
      sum +
      host.containers.filter((container) => container.state === 'running')
        .length,
    0,
  )

  if (configQuery.isError) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-destructive">
        Failed to load docker host configuration.
      </div>
    )
  }

  if (!configQuery.isLoading && hostRows.length === 0) {
    return <EmptyState text="No docker hosts configured" icon={Server} />
  }

  return (
    <div className={cn('flex h-full flex-1 flex-col gap-6')}>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold">Docker Hosts</h1>
            {hostRows.length ? (
              <Badge
                variant={BadgeVariant.secondary}
                className="text-xs font-medium"
              >
                {connectedHosts}/{hostRows.length} connected
              </Badge>
            ) : null}
          </div>
          <p className="text-sm text-muted-foreground">
            Manage configured docker hosts and the platform containers running
            on them.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          disabled={isLoading}
          onClick={() => {
            void configQuery.refetch()
            void stateQuery.refetch()
          }}
        >
          <RefreshCcw className="mr-2 size-4" />
          Refresh
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-lg border border-muted/40 bg-muted/10 p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Hosts
          </div>
          <div className="mt-2 text-2xl font-semibold">
            {isLoading && hostRows.length === 0 ? '—' : hostRows.length}
          </div>
        </div>
        <div className="rounded-lg border border-muted/40 bg-muted/10 p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Connected
          </div>
          <div className="mt-2 text-2xl font-semibold">
            {isLoading && hostRows.length === 0 ? '—' : connectedHosts}
          </div>
        </div>
        <div className="rounded-lg border border-muted/40 bg-muted/10 p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Containers
          </div>
          <div className="mt-2 text-2xl font-semibold">
            {isLoading && hostRows.length === 0 ? '—' : totalContainers}
          </div>
        </div>
        <div className="rounded-lg border border-muted/40 bg-muted/10 p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Running
          </div>
          <div className="mt-2 text-2xl font-semibold">
            {isLoading && hostRows.length === 0 ? '—' : runningContainers}
          </div>
        </div>
      </div>

      <DataTable
        data={hostRows}
        columns={serverDockerHostsTableColumns}
        rowCount={hostRows.length}
        className="border-muted/40 shadow-sm"
      />
    </div>
  )
}
