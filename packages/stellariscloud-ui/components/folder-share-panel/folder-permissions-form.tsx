import { FolderPermissionName } from '@stellariscloud/api-client'
import clsx from 'clsx'
import React from 'react'

import { Input } from '../../design-system/input/input'
import { Heading } from '../../design-system/typography'
import type { UserShareInput } from './folder-share-panel'

export const FolderPermissionsForm = ({
  folderShare,
  onFolderShareChange,
}: {
  folderShare: UserShareInput
  onFolderShareChange: (updatedFolderShare: UserShareInput) => void
  onClose?: () => void
}) => {
  const [emailError, _setEmailError] = React.useState(false)

  return (
    <div
      className={clsx(
        'flex flex-col gap-4 justify-between rounded-md bg-secondary text-white min-w-[34rem] min-h-[24rem]',
      )}
    >
      <div className="flex flex-col gap-4">
        <Heading level={6}>User email</Heading>
        <Input
          disabled={!!folderShare.id}
          error={emailError ? 'There is an error' : undefined}
          className="flex-1"
          value={folderShare.userInviteEmail}
          onChange={(e) =>
            onFolderShareChange({
              ...folderShare,
              userInviteEmail: e.target.value,
            })
          }
        />
        <Heading level={6}>Permissions</Heading>
        <div className="grid gap-2 grid-cols-2">
          {Object.values(FolderPermissionName).map((perm) => (
            <div key={perm} className={clsx('flex gap-2')}>
              <input
                type="checkbox"
                onChange={() => {
                  const existingIndex =
                    folderShare.shareConfiguration.permissions.indexOf(perm)

                  onFolderShareChange({
                    ...folderShare,
                    shareConfiguration: {
                      permissions:
                        existingIndex > -1
                          ? folderShare.shareConfiguration.permissions.filter(
                              (p) => p !== perm,
                            )
                          : folderShare.shareConfiguration.permissions.concat([
                              perm,
                            ]),
                    },
                  })
                }}
                checked={folderShare.shareConfiguration.permissions.includes(
                  perm,
                )}
                className="checkbox"
              />
              <label htmlFor={perm}>{perm}</label>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
