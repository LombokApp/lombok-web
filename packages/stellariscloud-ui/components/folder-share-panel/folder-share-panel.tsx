import {
  ArrowLeftIcon,
  PencilIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import type { FolderShareData } from '@stellariscloud/api-client'
import { Button, Heading, Icon } from '@stellariscloud/design-system'
import clsx from 'clsx'
import React from 'react'

import { isValidEmail } from '../../utils/validate'
import { FolderPermissionsForm } from './folder-permissions-form'

enum UIMode {
  LIST = 'LIST',
  EDIT = 'EDIT',
  CREATE = 'CREATE',
}

export interface UserShareInput {
  id?: string
  userInviteEmail: FolderShareData['userInviteEmail']
  shareConfiguration: FolderShareData['shareConfiguration']
}

export const FolderSharePanel = ({
  fetchFolderShares,
  onAddFolderShare,
  onUpdateFolderShare,
  onRemoveFolderShare,
  onClose,
  folderShares,
}: {
  fetchFolderShares: () => Promise<void>
  folderShares?: FolderShareData[]
  onAddFolderShare: (input: UserShareInput) => Promise<FolderShareData>
  onUpdateFolderShare: (input: UserShareInput) => Promise<FolderShareData>
  onRemoveFolderShare: (id: string) => Promise<{ success: boolean }>
  onClose: () => void
}) => {
  const [mode, setMode] = React.useState<UIMode>(UIMode.LIST)
  const [editingFolderShare, setEditingFolderShare] =
    React.useState<UserShareInput>()
  const [_emailError, setEmailError] = React.useState(false)

  React.useEffect(() => {
    setEmailError(
      (editingFolderShare?.userInviteEmail.length ?? 0) > 0 &&
        !isValidEmail(editingFolderShare?.userInviteEmail),
    )
  }, [editingFolderShare?.userInviteEmail])

  const handleAdd = () => {
    if (
      editingFolderShare?.userInviteEmail &&
      isValidEmail(editingFolderShare.userInviteEmail)
    ) {
      void onAddFolderShare(editingFolderShare).then(() => {
        setEditingFolderShare({
          userInviteEmail: '',
          shareConfiguration: { permissions: [] },
        })
        setMode(UIMode.LIST)
      })
    }
  }

  const handleUpdate = () => {
    if (
      editingFolderShare?.userInviteEmail &&
      isValidEmail(editingFolderShare.userInviteEmail)
    ) {
      void onUpdateFolderShare(editingFolderShare).then(() => {
        setEditingFolderShare({
          userInviteEmail: '',
          shareConfiguration: { permissions: [] },
        })
        setMode(UIMode.LIST)
      })
    }
  }
  const handleStartEdit = (item: FolderShareData) => {
    setEditingFolderShare({
      userInviteEmail: item.userInviteEmail,
      shareConfiguration: item.shareConfiguration,
      id: item.id,
    })
    setMode(UIMode.EDIT)
  }

  const handleStartCreate = () => {
    setEditingFolderShare({
      userInviteEmail: '',
      shareConfiguration: { permissions: [] },
    })
    setMode(UIMode.CREATE)
  }

  const handleBackToList = React.useCallback(() => {
    setMode(UIMode.LIST)
    setEditingFolderShare(undefined)
  }, [])

  React.useEffect(() => void fetchFolderShares(), [fetchFolderShares])

  return (
    <div
      className={clsx(
        'flex flex-col gap-4 justify-between rounded-md p-4 bg-secondary text-white min-w-[34rem] min-h-[24rem]',
      )}
    >
      {mode === UIMode.LIST && (
        <div className="flex flex-1 flex-col gap-4">
          <div className="flex justify-between">
            <Heading level={4}>Share folder</Heading>
            <Button variant="ghost" onClick={onClose}>
              <Icon icon={XMarkIcon}></Icon>
            </Button>
          </div>
          <div className="flex flex-1 flex-col gap-1">
            {folderShares && folderShares.length > 0 && (
              <div>
                <Heading level={6}>Users</Heading>
                <div className="flex flex-col gap-2 h-full">
                  {folderShares.map((folderShare) => (
                    <div
                      className="flex items-center gap-2"
                      key={folderShare.id}
                    >
                      <div className="flex-1">{folderShare.userLabel}</div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleStartEdit(folderShare)}
                      >
                        <Icon icon={PencilIcon}></Icon>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => void onRemoveFolderShare(folderShare.id)}
                      >
                        <Icon icon={XMarkIcon}></Icon>
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {folderShares?.length === 0 && (
              <div className="italic">
                You have not shared this folder with any users
              </div>
            )}
            {!folderShares && <div className="italic">Loading</div>}
          </div>
          <Button
            variant="primary"
            onClick={handleStartCreate}
            className="px-6"
          >
            Add share
          </Button>
        </div>
      )}
      {mode === UIMode.EDIT && editingFolderShare?.id && (
        <div className="flex flex-col gap-4 p-2">
          <div className="flex justify-between items-start">
            <Button variant="ghost" onClick={() => setMode(UIMode.LIST)}>
              <div className="flex gap-2 items-center">
                <Icon icon={ArrowLeftIcon} />
                Back
              </div>
            </Button>
            <Button variant="ghost" onClick={onClose}>
              <Icon icon={XMarkIcon}></Icon>
            </Button>
          </div>
          <div className="flex flex-col justify-between">
            <Heading level={4}>
              Edit permissions for {editingFolderShare.userInviteEmail}
            </Heading>
            <span>{editingFolderShare.id}</span>
          </div>

          <FolderPermissionsForm
            folderShare={editingFolderShare}
            onFolderShareChange={(updatedFolderShare) =>
              setEditingFolderShare(updatedFolderShare)
            }
          />
          <div className="flex gap-4 justify-end">
            <Button
              variant="outline"
              onClick={handleBackToList}
              className="px-6"
            >
              Cancel
            </Button>
            <Button variant="primary" onClick={handleUpdate} className="px-6">
              Save permissions
            </Button>
          </div>
        </div>
      )}
      {mode === UIMode.CREATE && editingFolderShare && (
        <div className="flex flex-col gap-4 p-2">
          <div className="flex justify-between items-start">
            <Button variant="ghost" onClick={() => setMode(UIMode.LIST)}>
              <div className="flex gap-2 items-center">
                <Icon icon={ArrowLeftIcon} />
                Back
              </div>
            </Button>
            <Button variant="ghost" onClick={onClose}>
              <Icon icon={XMarkIcon}></Icon>
            </Button>
          </div>
          <div className="flex justify-between">
            <Heading level={4}>Create new share</Heading>
          </div>

          <FolderPermissionsForm
            folderShare={editingFolderShare}
            onFolderShareChange={(updatedFolderShare) =>
              setEditingFolderShare(updatedFolderShare)
            }
          />
          <div className="flex gap-4 justify-end">
            <Button
              variant="outline"
              onClick={() => setMode(UIMode.LIST)}
              className="px-6"
            >
              Cancel
            </Button>
            <Button variant="primary" onClick={handleAdd} className="px-6">
              Share folder
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
