import React from 'react'

import { $api } from '@/src/services/api'

interface Breadcrumb {
  label: string
  href?: string
}

/**
 * Builds breadcrumbs for docker pages, resolving host labels and container
 * labels from the management API rather than showing raw UUIDs.
 *
 * Expected serverPage patterns:
 *   ["docker"]                                     → Docker
 *   ["docker", hostId]                             → Docker / <HostLabel>
 *   ["docker", hostId, "containers", containerId]  → Docker / <HostLabel> / <ContainerLabel>
 */
export function useDockerBreadcrumbs(serverPage: string[]): Breadcrumb[] {
  const hostId = serverPage[1]
  const containerId =
    serverPage[2] === 'containers' ? serverPage[3] : undefined

  const hostsQuery = $api.useQuery('get', '/api/v1/docker/hosts', undefined, {
    enabled: !!hostId,
  })

  const standaloneQuery = $api.useQuery(
    'get',
    '/api/v1/docker/standalone-containers',
    hostId ? { params: { query: { dockerHostId: hostId } } } : undefined,
    { enabled: !!containerId },
  )

  return React.useMemo(() => {
    const crumbs: Breadcrumb[] = [
      { label: 'Server', href: '/server' },
      { label: 'Docker', href: '/server/docker' },
    ]

    if (!hostId) return crumbs

    const host = hostsQuery.data?.result?.find((h) => h.id === hostId)
    const hostLabel = host?.label ?? hostId.slice(0, 8)

    crumbs.push({
      label: hostLabel,
      href: containerId ? `/server/docker/${hostId}` : undefined,
    })

    if (!containerId) return crumbs

    const standalone = standaloneQuery.data?.result?.find(
      (sc) => sc.containerId === containerId,
    )
    const containerLabel = standalone?.label ?? containerId.slice(0, 12)

    crumbs.push({ label: containerLabel })

    return crumbs
  }, [hostId, containerId, hostsQuery.data, standaloneQuery.data])
}
