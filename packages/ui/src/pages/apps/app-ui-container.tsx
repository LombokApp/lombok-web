import { Skeleton } from '@lombokapp/ui-toolkit/components/skeleton'
import React from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router'

import { useServerContext } from '@/src/contexts/server'
import { $apiClient } from '@/src/services/api'
import { toQueryString } from '@/src/utils/query'
import { AppUI } from '@/src/views/app-ui/app-ui.view'

export const AppUIContainer = () => {
  const protocol = window.location.protocol
  const hostname = window.location.hostname
  const port = window.location.port
  const API_HOST = `${hostname}${port ? `:${port}` : ''}`

  const navigate = useNavigate()
  const { '*': subPath } = useParams()
  const pathParts = (subPath?.split('/') ?? []).filter(Boolean)
  const path = `${pathParts.length > 1 ? '/' : ''}${pathParts.slice(1).join('/')}`
  const appIdentifier = pathParts[0] ?? ''
  const [searchParams] = useSearchParams()
  const pathAndQuery = `${path}${toQueryString(Object.fromEntries(searchParams))}`

  const serverContext = useServerContext()

  // Generate app-specific user access token
  const getAppAccessTokens = React.useCallback(
    () =>
      $apiClient
        .POST('/api/v1/user/apps/{appIdentifier}/access-token', {
          params: {
            path: {
              appIdentifier,
            },
          },
        })
        .then((res) => {
          if (!res.data) {
            throw new Error('Failed to generate app access token')
          }
          return res.data.session
        }),
    [appIdentifier],
  )

  if (!appIdentifier) {
    if (serverContext.appsLoaded) {
      setTimeout(() => void navigate('/folders'), 1)
      throw new Error('Invalid app identifier or route identifier')
    }
    return (
      <div className="flex size-full">
        <div className="flex flex-1 flex-col gap-6 p-6">
          {/* Header skeleton */}
          <div className="flex items-center justify-between">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-10 w-32" />
          </div>

          {/* Main content area skeleton */}
          <div className="flex flex-1 flex-col gap-4">
            <Skeleton className="h-6 w-64" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />

            {/* Content grid skeleton */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="flex flex-col gap-3 rounded-lg border p-4"
                >
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-2/3" />
                  <Skeleton className="h-8 w-24" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  const handleNavigateTo = (to: { pathAndQuery: string }) => {
    const fullPathAndQuery = `/apps/${appIdentifier}${to.pathAndQuery}`
    void navigate(fullPathAndQuery)
  }
  return (
    <div className="flex size-full">
      <AppUI
        shouldRelayNavigation={true}
        getAccessTokens={getAppAccessTokens}
        appIdentifier={appIdentifier}
        onNavigateTo={handleNavigateTo}
        pathAndQuery={pathAndQuery}
        host={API_HOST}
        scheme={protocol}
      />
    </div>
  )
}
