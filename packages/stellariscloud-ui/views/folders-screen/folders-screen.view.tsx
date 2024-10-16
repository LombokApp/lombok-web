import { PlusIcon } from '@heroicons/react/20/solid'
import type {
  FolderGetResponse,
  FoldersApiCreateFolderRequest,
  StorageProvisionDTO,
} from '@stellariscloud/api-client'
import clsx from 'clsx'
import Link from 'next/link'
import { useRouter } from 'next/router'
import React from 'react'

import { ConfirmForgetFolderModal } from '../../components/confirm-forget-folder-modal/confirm-forget-folder-modal'
import { CreateFolderForm } from '../../components/create-folder-form/create-folder-form'
import { CreateFolderStartPanel } from '../../components/create-folder-start-panel/create-folder-start-panel'
import { FolderCard } from '../../components/folder-card/folder-card'
import { apiClient, foldersApiHooks } from '../../services/api'

export const FoldersScreen = () => {
  const router = useRouter()
  const [folders, setFolders] = React.useState<FolderGetResponse[]>()
  const [folderFormKey, setFolderFormKey] = React.useState<string>()
  const [forgetFolderConfirmationOpen, setForgetFolderConfirmationOpen] =
    React.useState<string | false>(false)
  const [storageProvisions, setStorageProvisions] = React.useState<
    StorageProvisionDTO[]
  >([])
  const handleForgetFolder = React.useCallback(
    (folderId: string) => {
      if (!forgetFolderConfirmationOpen) {
        setForgetFolderConfirmationOpen(folderId)
      } else {
        setForgetFolderConfirmationOpen(false)
        void apiClient.foldersApi
          .deleteFolder({ folderId })
          .then(() =>
            setFolders(folders?.filter((b) => b.folder.id !== folderId)),
          )
      }
    },
    [setForgetFolderConfirmationOpen, forgetFolderConfirmationOpen /*folders*/],
  )

  const handleStartCreate = () => {
    void apiClient.storageProvisionsApi
      .listStorageProvisions()
      .then((resp) => setStorageProvisions(resp.data.result))

    void router.push({
      pathname: router.pathname,
      query: { add: 'true' },
    })
  }

  const listFolders = foldersApiHooks.useListFolders({}, { retry: 0 })
  const refreshFolders = React.useCallback(() => {
    void listFolders
      .refetch()
      .then((response) => setFolders(response.data?.result))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listFolders.refetch])

  // reflect add query flag state
  React.useEffect(() => {
    if (router.query.add === 'true' && !folderFormKey) {
      setFolderFormKey(`${Math.random()}`)
    } else if (router.query.add !== 'true' && folderFormKey) {
      setFolderFormKey(undefined)
    }
  }, [router.query.add, folderFormKey])

  React.useEffect(() => {
    refreshFolders()
  }, [refreshFolders])

  const handleCreateFolder = (
    folder: FoldersApiCreateFolderRequest['folderCreateInputDTO'],
  ) => {
    void apiClient.foldersApi
      .createFolder({ folderCreateInputDTO: folder })
      .then((response) => {
        setFolders(
          folders?.concat([{ folder: response.data.folder, permissions: [] }]),
        )
        void router.push({ pathname: router.pathname })
      })
  }

  return (
    <>
      {forgetFolderConfirmationOpen && (
        <ConfirmForgetFolderModal
          onConfirm={() => handleForgetFolder(forgetFolderConfirmationOpen)}
          onCancel={() => setForgetFolderConfirmationOpen(false)}
        />
      )}

      <div
        className={clsx(
          'items-center flex flex-1 flex-col gap-6 h-full overflow-y-auto',
        )}
      >
        <div className="container flex-1 flex flex-col gap-4 p-8">
          {folderFormKey && (
            <div
              className={clsx(
                'overflow-hidden flex flex-col items-center flex-1',
              )}
            >
              <div className="p-10 rounded-xl w-fit border border-gray-200 bg-white">
                <CreateFolderForm
                  onCancel={() =>
                    void router.push({ pathname: router.pathname })
                  }
                  storageProvisions={storageProvisions}
                  key={folderFormKey}
                  onSubmit={handleCreateFolder}
                />
              </div>
            </div>
          )}

          <ul
            className={clsx(
              'grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 w-full duration-200',
              folderFormKey && 'opacity-0',
            )}
          >
            {folders?.map((folderAndPermission, i) => (
              <li key={folderAndPermission.folder.id} className="col-span-1">
                <Link
                  href={`/folders/${folderAndPermission.folder.id}`}
                  key={i}
                  className="rounded-lg w-full"
                >
                  <FolderCard
                    folderAndPermission={folderAndPermission}
                    onForget={() =>
                      handleForgetFolder(folderAndPermission.folder.id)
                    }
                  />
                </Link>
              </li>
            ))}
            {folders !== undefined && (
              <li className="">
                <CreateFolderStartPanel onCreate={handleStartCreate} />
              </li>
            )}
          </ul>
          {!folders && <div className="animate-pulse">Loading folders...</div>}
        </div>
      </div>
    </>
  )
}
