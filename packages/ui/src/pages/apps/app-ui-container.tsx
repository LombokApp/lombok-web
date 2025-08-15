import React from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { ContentLayout } from '@/src/components/sidebar/components/content-layout'
import { useServerContext } from '@/src/hooks/use-server-context'
import { $apiClient } from '@/src/services/api'
import { AppUI } from '@/src/views/app-ui/app-ui.view'

const protocol = window.location.protocol
const hostname = window.location.hostname
const port = window.location.port
const API_HOST = `${hostname}${port ? `:${port}` : ''}`

export const AppUIContainer = () => {
  const navigate = useNavigate()
  const { '*': subPath } = useParams()
  const pathParts = subPath?.split('/') ?? []
  const appIdentifier = pathParts[0]
  const uiIdentifier = pathParts[1]
  const url = pathParts.slice(2).join('/')
  const serverContext = useServerContext()
  const app = serverContext.apps?.result.find(
    (_app) => _app.identifier === appIdentifier,
  )
  const uiLabel =
    app?.config.ui?.[uiIdentifier ?? '']?.menuItems.find(
      (_menuItem) => _menuItem.url === url,
    )?.label ?? ''

  const appLabel = app?.label

  if (!appIdentifier || !uiIdentifier) {
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

  return (
    <ContentLayout
      breadcrumbs={[{ label: `App: ${appLabel ?? appIdentifier}` }].concat(
        uiLabel ? [{ label: uiLabel }] : [],
      )}
      contentPadding={false}
    >
      <div className="flex size-full">
        <AppUI
          getAccessTokens={getAppAccessTokens}
          appIdentifier={appIdentifier}
          uiIdentifier={uiIdentifier}
          url={url}
          host={API_HOST}
          scheme={protocol}
        />
      </div>
    </ContentLayout>
  )
}
