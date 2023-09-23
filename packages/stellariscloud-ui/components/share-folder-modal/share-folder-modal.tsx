import type { FoldersApi } from '@stellariscloud/api-client'
import clsx from 'clsx'
import React from 'react'

import type { IFolderContext } from '../../contexts/folder.context'
import { Modal } from '../../design-system/modal/modal'
import { FolderSharePanel } from '../folder-share-panel/folder-share-panel'

export const ShareFolderModal = ({
  onClose,
  folderContext,
  foldersApi,
}: {
  onClose: () => void
  folderContext: IFolderContext
  foldersApi: FoldersApi
}) => {
  return (
    <Modal onClose={onClose}>
      <div
        className={clsx(
          'flex gap-4 justify-between rounded-md p-4 bg-secondary hover:bg-secondary-focus text-white min-w-[24rem] min-h-[14rem]',
        )}
      >
        <div className="h-screen w-screen bg-black/[.75] flex flex-col justify-around items-center">
          <FolderSharePanel
            fetchFolderShares={folderContext.refreshFolderShares}
            folderShares={folderContext.folderShares}
            onRemoveFolderShare={(shareId) =>
              foldersApi
                .deleteFolderShare({
                  folderId: folderContext.folderId,
                  shareId,
                })
                .then((r) => {
                  void folderContext.refreshFolderShares()
                  return r.data
                })
            }
            onUpdateFolderShare={({ id, shareConfiguration }) => {
              return foldersApi
                .updateFolderShare({
                  folderId: folderContext.folderId,
                  shareId: id ?? '',
                  updateFolderSharePayload: {
                    shareConfiguration,
                  },
                })
                .then((r) => {
                  void folderContext.refreshFolderShares()
                  return r.data
                })
            }}
            onAddFolderShare={({ shareConfiguration, userInviteEmail }) => {
              return foldersApi
                .createFolderShare({
                  folderId: folderContext.folderId,
                  createFolderSharePayload: {
                    shareConfiguration,
                    userInviteEmail,
                  },
                })
                .then((r) => {
                  void folderContext.refreshFolderShares()
                  return r.data
                })
            }}
            onClose={onClose}
          />
        </div>
      </div>
    </Modal>
  )
}
