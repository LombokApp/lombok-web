import { useAuthContext } from '@stellariscloud/auth-utils'

import { ServerAccessKeyDetailScreen } from '../../../../views/server/config/storage/server-access-keys/server-access-key-detail-screen/server-access-key-detail-screen.view'

const ServerStorageAccessKeysPage = () => {
  const authContext = useAuthContext()
  return (
    <div className="size-full">
      {authContext.authState.isAuthenticated && authContext.viewer?.isAdmin && (
        <ServerAccessKeyDetailScreen />
      )}
    </div>
  )
}

export default ServerStorageAccessKeysPage
