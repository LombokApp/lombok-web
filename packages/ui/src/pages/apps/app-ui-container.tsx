import { useAuthContext } from '@stellariscloud/auth-utils'
import React from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { ContentLayout } from '@/src/components/sidebar/components/content-layout'
import { useServerContext } from '@/src/hooks/use-server-context'
import { AppUI } from '@/src/views/app-ui/app-ui.view'

const protocol = window.location.protocol
const hostname = window.location.hostname
const port = window.location.port
const API_HOST = `${hostname}${port ? `:${port}` : ''}`

export const AppUIContainer = () => {
  const navigate = useNavigate()
  const authContext = useAuthContext()
  const { '*': subPath } = useParams()
  const pathParts = subPath?.split('/') ?? []
  const appIdentifier = pathParts[0]
  const uiName = pathParts[1]
  const serverContext = useServerContext()
  const app = serverContext.apps?.result.find(
    (_app) => _app.identifier === appIdentifier,
  )
  const uiLabel = app?.config.uis?.[uiName].menuItems.find(
    (_menuItem) => _menuItem.uiName === uiName,
  )?.label

  const appLabel = app?.label

  if (!appIdentifier || !uiName) {
    void navigate('/folders')
    return null
  }

  // if the access token is not available we'll be redirecting away from this screen anyway
  const getAccessTokeOrEmptyString = React.useCallback(async () => {
    const accessToken = await authContext.getAccessToken()
    return accessToken ?? ''
  }, [authContext])

  return (
    <ContentLayout
      breadcrumbs={[{ label: `App: ${appLabel ?? appIdentifier}` }].concat(
        uiLabel ? [{ label: uiLabel }] : [],
      )}
      contentPadding={false}
    >
      <div className="flex size-full">
        <AppUI
          getAccessToken={getAccessTokeOrEmptyString}
          appIdentifier={appIdentifier}
          uiName={uiName}
          host={API_HOST}
          scheme={protocol}
        />
      </div>
    </ContentLayout>
  )
}
