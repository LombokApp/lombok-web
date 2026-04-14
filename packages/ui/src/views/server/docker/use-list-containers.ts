import React from 'react'

import { $api } from '@/src/services/api'

import type { HostContainerRow } from './server-docker-host-containers-table-columns'

/**
 * Loads containers by combining runtime host state with standalone DB records.
 * Pass `hostId` to scope to a single host, or omit for all hosts.
 */
export function useListContainers(options?: { hostId?: string }) {
  const hostId = options?.hostId

  const hostsQuery = $api.useQuery('get', '/api/v1/docker/hosts')
  const stateQuery = $api.useQuery('get', '/api/v1/server/docker-hosts/state')
  const standaloneQuery = $api.useQuery(
    'get',
    '/api/v1/docker/standalone-containers',
    hostId ? { params: { query: { dockerHostId: hostId } } } : undefined,
  )

  const isLoading =
    stateQuery.isLoading || standaloneQuery.isLoading || hostsQuery.isLoading

  const rows = React.useMemo<HostContainerRow[]>(() => {
    const hosts = hostsQuery.data?.result ?? []
    const hostIdToLabel = new Map(hosts.map((h) => [h.id, h.label]))
    const stateHosts = (stateQuery.data?.hosts ?? []).filter(
      (h) => !hostId || h.id === hostId,
    )
    const standaloneRecords = standaloneQuery.data?.result ?? []

    // 1. Runtime containers
    const runtimeContainerIds = new Set<string>()
    const result: HostContainerRow[] = stateHosts.flatMap((hs) =>
      hs.containers.map((c) => {
        runtimeContainerIds.add(c.id)
        const match = standaloneRecords.find((sc) => sc.containerId === c.id)
        return {
          id: c.id,
          image: c.image,
          state: c.state,
          createdAt: c.createdAt,
          containerType: c.containerType,
          containerLabel: match?.label,
          profileId:
            c.containerType === 'worker' ? c.profileId : undefined,
          hostId: hs.id,
          hostLabel: hostIdToLabel.get(hs.id) ?? hs.id,
        }
      }),
    )

    // 2. Standalone DB records not present at runtime
    for (const sc of standaloneRecords) {
      if (sc.containerId && runtimeContainerIds.has(sc.containerId)) {
        continue
      }
      result.push({
        id: sc.containerId,
        image: `${sc.image}:${sc.tag}`,
        state: 'not_found',
        createdAt: sc.createdAt,
        containerType: 'standalone',
        containerLabel: sc.label,
        hostId: sc.dockerHostId,
        hostLabel: hostIdToLabel.get(sc.dockerHostId) ?? sc.dockerHostId,
      })
    }

    return result
  }, [hostsQuery.data, stateQuery.data, standaloneQuery.data, hostId])

  const refetch = React.useCallback(() => {
    void stateQuery.refetch()
    void standaloneQuery.refetch()
  }, [stateQuery, standaloneQuery])

  const standaloneRecordsResult = standaloneQuery.data?.result ?? []
  return {
    rows,
    isLoading,
    refetch,
    standaloneRecords: standaloneRecordsResult,
  }
}
