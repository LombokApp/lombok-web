import type { FolderAndPermission } from '@stellariscloud/api-client'
import { FolderPermissionName } from '@stellariscloud/api-client'
import type { FolderMetadata } from '@stellariscloud/types'
import { formatBytes } from '@stellariscloud/utils'
import React from 'react'

import { Button } from '../../design-system/button/button'

export const FolderDetailSidePanel = ({
  folderAndPermissions,
  folderIndex,
  onRefreshFolder,
  onShareClick,
  onForgetFolder,
  websocketConnected,
}: {
  folderAndPermissions?: FolderAndPermission
  folderIndex?: FolderMetadata
  onRefreshFolder?: () => void
  generatingThumbnails: boolean
  onShareClick?: () => void
  onRecalculateLocalStorage: () => Promise<void>
  onPurgeLocalStorage: () => Promise<void>
  localStorageFolderSizes: { [folderId: string]: number }
  onForgetFolder?: () => void
  websocketConnected: boolean
}) => {
  return (
    <div className="flex flex-col gap-4 p-6 pt-20 text-grey-800dark:text-white min-w-[25rem]">
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
            FolderPermissionName.FolderRefresh,
          ) && (
            <Button size="md" onClick={onRefreshFolder}>
              {!folderIndex?.indexingJobContext
                ? 'Refresh folder'
                : 'Continue folder refresh'}
            </Button>
          )}
          {folderAndPermissions?.permissions.includes(
            FolderPermissionName.FolderForget,
          ) && (
            <Button size="md" onClick={onForgetFolder}>
              Forget folder
            </Button>
          )}
          {folderAndPermissions?.permissions.includes(
            FolderPermissionName.FolderManageShares,
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
