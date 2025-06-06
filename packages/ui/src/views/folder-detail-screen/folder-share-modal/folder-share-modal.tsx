import type { FolderPermissionName } from '@stellariscloud/types'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@stellariscloud/ui-toolkit'

import { $api } from '../../../services/api'
import { FolderShareForm } from '../folder-share-form/folder-share-form'

interface ModalData {
  isOpen: boolean
  shares?: { userId: string; permissions: string[] }[]
}

interface FolderShareModalProps {
  modalData: ModalData
  setModalData: (modalData: ModalData) => void
  onSubmit: (values: {
    shares: { userId: string; permissions: FolderPermissionName[] }[]
  }) => Promise<void>
  folderId: string
}

export const FolderShareModal = ({
  modalData,
  setModalData,
  // onSubmit,
  folderId,
}: FolderShareModalProps) => {
  // const { toast } = useToast()

  const listFolderShareUsersQuery = $api.useQuery(
    'get',
    '/api/v1/folders/{folderId}/user-share-options',
    {
      params: {
        path: {
          folderId,
        },
      },
    },
  )

  const listFolderSharesQuery = $api.useQuery(
    'get',
    '/api/v1/folders/{folderId}/shares',
    {
      params: {
        path: {
          folderId,
        },
      },
    },
  )

  const deleteFolderShareMutation = $api.useMutation(
    'delete',
    '/api/v1/folders/{folderId}/shares/{userId}',
  )

  const upsertFolderShareMutation = $api.useMutation(
    'post',
    '/api/v1/folders/{folderId}/shares/{userId}',
  )

  return (
    <Dialog
      open={modalData.isOpen}
      onOpenChange={(open) => {
        if (!open) {
          setModalData({ ...modalData, isOpen: false })
        }
      }}
    >
      <DialogContent aria-describedby={undefined}>
        <DialogHeader className="text-left">
          <DialogTitle>Share Folder</DialogTitle>
          <DialogDescription>
            Manage who has access to this folder and what permissions they have.
          </DialogDescription>
        </DialogHeader>
        <div className="w-full">
          <FolderShareForm
            folderId={folderId}
            listFolderShareUsersQuery={listFolderShareUsersQuery}
            listFolderSharesQuery={listFolderSharesQuery}
            deleteFolderShareMutation={deleteFolderShareMutation}
            upsertFolderShareMutation={upsertFolderShareMutation}
            onCancel={() => setModalData({ ...modalData, isOpen: false })}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
