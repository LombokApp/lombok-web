import { PlusIcon } from '@heroicons/react/20/solid'
import type {
  FolderAndPermission,
  FoldersApiCreateFolderRequest,
  S3ConnectionData,
} from '@stellariscloud/api-client'
import clsx from 'clsx'
import Link from 'next/link'
import { useRouter } from 'next/router'
import React from 'react'

import { ConfirmForgetFolderModal } from '../../components/confirm-forget-folder-modal/confirm-forget-folder-modal'
import { CreateFolderForm } from '../../components/create-folder-form/create-folder-form'
import { FolderCard } from '../../components/folder-card/folder-card'
import { FoldersEmptyState } from '../../components/folders-empty-state/folders-empty-state'
import { Takeover } from '../../components/takeover/takeover'
import { Banner } from '../../design-system/banner/banner'
import { Button } from '../../design-system/button/button'
import { Icon } from '../../design-system/icon/icon'
import { PageHeading } from '../../design-system/page-heading/page-heading'
import {
  foldersApi,
  foldersApiHooks,
  s3ConnectionsAPI,
} from '../../services/api'

export const ListFoldersScreen = () => {
  const router = useRouter()
  const [folders, setFolders] = React.useState<FolderAndPermission[]>()
  const [folderFormKey, setFolderFormKey] = React.useState<string>()
  const [s3Connections, setS3Connections] = React.useState<S3ConnectionData[]>()
  const [forgetFolderConfirmationOpen, setForgetFolderConfirmationOpen] =
    React.useState<string | false>(false)

  const handleForgetFolder = React.useCallback(
    (folderId: string) => {
      if (!forgetFolderConfirmationOpen) {
        setForgetFolderConfirmationOpen(folderId)
      } else {
        setForgetFolderConfirmationOpen(false)
        void foldersApi
          .deleteFolder({ folderId })
          .then(() =>
            setFolders(folders?.filter((b) => b.folder.id !== folderId)),
          )
      }
    },
    [setForgetFolderConfirmationOpen, forgetFolderConfirmationOpen, folders],
  )

  const handleStartCreate = () =>
    void router.push({
      pathname: router.pathname,
      query: { add: 'true' },
    })

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
    void s3ConnectionsAPI
      .listS3Connections()
      .then((response) => setS3Connections(response.data.result))
  }, [])

  React.useEffect(() => {
    refreshFolders()
  }, [refreshFolders])

  const handleCreateFolder = (
    folder: FoldersApiCreateFolderRequest['createFolderRequest'],
  ) => {
    void foldersApi
      .createFolder({ createFolderRequest: folder })
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
        <Takeover>
          <div className="h-screen w-screen bg-black/[.75] flex flex-col justify-around items-center">
            <ConfirmForgetFolderModal
              onConfirm={() => handleForgetFolder(forgetFolderConfirmationOpen)}
              onCancel={() => setForgetFolderConfirmationOpen(false)}
            />
          </div>
        </Takeover>
      )}

      <div className={clsx('items-center flex flex-col gap-6 h-full px-6')}>
        <div className="container flex-1 flex flex-col">
          <div className="py-4 flex items-start gap-10">
            <PageHeading title={folderFormKey ? 'New Folder' : 'Your Folders'}>
              {!folderFormKey && (
                <Button size="lg" primary={true} onClick={handleStartCreate}>
                  <Icon size="sm" icon={PlusIcon} className="text-white" />
                  New Folder
                </Button>
              )}
            </PageHeading>
          </div>
          <div
            className={clsx(
              'overflow-hidden flex flex-col justify-around duration-200 items-center',
              !folderFormKey ? 'h-0' : 'flex-1',
            )}
          >
            <div className="p-4 rounded w-fit">
              <>
                {s3Connections && s3Connections.length === 0 && (
                  <div className="py-4">
                    <Banner
                      type="warn"
                      body="You have no S3 connections. You'll need at least one
                    before you can create a folder."
                    />
                  </div>
                )}
                <CreateFolderForm
                  onCancel={() =>
                    void router.push({ pathname: router.pathname })
                  }
                  s3Connections={s3Connections ?? []}
                  key={folderFormKey}
                  onSubmit={(values) =>
                    handleCreateFolder({
                      s3ConnectionId: values.s3Connection.id,
                      name: values.name,
                      bucket: values.bucket,
                      prefix: values.prefix,
                    })
                  }
                />
              </>
            </div>
          </div>
          {folders?.length === 0 && !folderFormKey ? (
            <div className="flex flex-1 flex-col items-center justify-around">
              <div className="w-fit">
                <FoldersEmptyState onCreate={handleStartCreate} />
              </div>
            </div>
          ) : (
            <ul
              className={clsx(
                'grid grid-cols-1 py-4 gap-6 sm:grid-cols-2 lg:grid-cols-3 w-full duration-200',
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
            </ul>
          )}
          {!folders && <div className="animate-pulse">Loading folders...</div>}
        </div>
      </div>
    </>
  )
}
