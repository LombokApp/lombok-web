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
  const uiName = pathParts[1]
  const serverContext = useServerContext()
  const app = serverContext.apps?.result.find(
    (_app) => _app.identifier === appIdentifier,
  )
  const uiLabel =
    app?.config.uis?.[uiName ?? '']?.menuItems.find(
      (_menuItem) => _menuItem.uiName === uiName,
    )?.label ?? ''

  const appLabel = app?.label

  if (!appIdentifier || !uiName) {
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
          uiName={uiName}
          host={API_HOST}
          scheme={protocol}
        />
      </div>
    </ContentLayout>
  )
}
