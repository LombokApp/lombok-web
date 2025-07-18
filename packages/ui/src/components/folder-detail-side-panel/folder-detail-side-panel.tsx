import type { FolderGetResponse, FolderMetadata } from '@stellariscloud/types'
import { FolderPermissionEnum } from '@stellariscloud/types'
import { Button } from '@stellariscloud/ui-toolkit'
import { formatBytes } from '@stellariscloud/utils'

export const FolderDetailSidePanel = ({
  folderAndPermissions,
  folderIndex,
  onRefreshFolder,
  onShareClick,
  onForgetFolder,
  websocketConnected,
}: {
  folderAndPermissions?: FolderGetResponse
  folderIndex?: FolderMetadata
  onRefreshFolder?: () => void
  generatingThumbnails: boolean
  onShareClick?: () => void
  onRecalculateLocalStorage: () => Promise<void>
  onPurgeLocalStorage: () => Promise<void>
  localStorageFolderSizes: Record<string, number>
  onForgetFolder?: () => void
  websocketConnected: boolean
}) => {
  return (
    <div className="flex min-w-[25rem] flex-col gap-4 p-6 pt-20 text-gray-800 dark:text-white">
      <div className="flex flex-col">
        <div className="opacity-50">Total files</div>
        <div>
          {folderIndex && (
            <span className="opacity-80">{folderIndex.totalCount}</span>
          )}
        </div>
      </div>
      <div className="flex flex-col">
        <div className="flex flex-col">
          <div className="opacity-50">Total size</div>
          <div>
            {folderIndex && (
              <span className="opacity-80">
                {formatBytes(folderIndex.totalSizeBytes)}
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="flex flex-col">
        <div className="opacity-50">Websocket</div>
        <div>
          {websocketConnected ? (
            <span className="text-green-500">CONNECTED</span>
          ) : (
            <span className="text-red-500">DISCONNECTED</span>
          )}
        </div>
      </div>
      <div className="flex flex-col">
        <div className="opacity-50">Actions</div>
        <div className="flex flex-col gap-2 pt-2">
          {folderAndPermissions?.permissions.includes(
            FolderPermissionEnum.FOLDER_REINDEX,
          ) && (
            <Button size="md" onClick={onRefreshFolder}>
              {!folderIndex?.indexingJobContext
                ? 'Refresh folder'
                : 'Continue folder refresh'}
            </Button>
          )}
          {folderAndPermissions?.permissions.includes(
            FolderPermissionEnum.FOLDER_FORGET,
          ) && (
            <Button size="md" onClick={onForgetFolder}>
              Forget folder
            </Button>
          )}
          {folderAndPermissions?.permissions.includes(
            FolderPermissionEnum.OBJECT_MANAGE,
          ) && (
            <Button size="md" onClick={onShareClick}>
              Share folder
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
