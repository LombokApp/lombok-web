import { useAuthContext } from '@stellariscloud/auth-utils'

import { UserStorageProvisionDetailScreen } from '../../../../views/server/config/storage/user-storage-provisions/user-storage-provision-detail-screen/user-storage-provision-detail-screen.view'

const ServerStorageProvisionsPage = () => {
  const authContext = useAuthContext()
  return (
    <div className="size-full">
      {authContext.authState.isAuthenticated && authContext.viewer?.isAdmin && (
        <UserStorageProvisionDetailScreen />
      )}
    </div>
  )
}

export default ServerStorageProvisionsPage
