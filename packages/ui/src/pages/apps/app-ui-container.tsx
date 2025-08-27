import React from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'

import { useServerContext } from '@/src/contexts/server'
import { $apiClient } from '@/src/services/api'
import { AppUI } from '@/src/views/app-ui/app-ui.view'

export const AppUIContainer = () => {
  // Move constants inside component to avoid HMR issues
  const protocol = window.location.protocol
  const hostname = window.location.hostname
  const port = window.location.port
  const API_HOST = `${hostname}${port ? `:${port}` : ''}`

  const navigate = useNavigate()
  const { '*': subPath } = useParams()
  const [searchParams] = useSearchParams()
  const pathParts = subPath?.split('/') ?? []
  const appIdentifier = pathParts[0] ?? ''
  const routeIdentifier = pathParts[1]
  const url = `/${pathParts.slice(2).join('/')}`
  const serverContext = useServerContext()
  // const uiLabel =
  //   serverContext.appContributions?.[
  //     appIdentifier
  //   ]?.contributions.sidebarMenuLinks.find(
  //     (sidebarMenuLink) => sidebarMenuLink.path === url,
  //   )?.label ?? ''

  if (!appIdentifier || !routeIdentifier) {
    void navigate('/folders')
    return null
  }

  // Generate app-specific user access token
  const getAppAccessTokens = React.useCallback(
    () =>
      $apiClient
        .POST('/api/v1/server/apps/{appIdentifier}/user-access-token', {
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

  const queryParams = React.useMemo(
    () => ({
      basePath: `${protocol}//${hostname}${port ? `:${port}` : ''}`,
      ...Object.fromEntries(searchParams),
    }),
    [searchParams, protocol, hostname, port],
  )

  return (
    <div className="flex size-full">
      <AppUI
        getAccessTokens={getAppAccessTokens}
        appIdentifier={appIdentifier}
        uiIdentifier={
          serverContext.appContributions.routes[appIdentifier]?.[
            routeIdentifier
          ]?.uiIdentifier ?? ''
        }
        queryParams={queryParams}
        url={url}
        host={API_HOST}
        scheme={protocol}
      />
    </div>
  )
}
