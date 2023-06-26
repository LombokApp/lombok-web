import { PlusIcon } from '@heroicons/react/24/outline'
import type {
  FolderAndPermission,
  FoldersApiCreateFolderRequest,
  S3ConnectionData,
} from '@stellariscloud/api-client'
import { Button, Heading, Icon } from '@stellariscloud/design-system'
import clsx from 'clsx'
import Link from 'next/link'
import { useRouter } from 'next/router'
import React from 'react'

import { ConfirmForgetFolder } from '../../components/confirm-forget-folder/confirm-forget-folder'
import { CreateFolderForm } from '../../components/create-folder-form/create-folder-form'
import { FolderCard } from '../../components/folder-card/folder-card'
import { Takeover } from '../../components/takeover/takeover'
import {
  foldersApi,
  foldersApiHooks,
  s3ConnectionsAPI,
} from '../../services/api'

export const FoldersScreen = () => {
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
    folder: FoldersApiCreateFolderRequest['inlineObject'],
  ) => {
    void foldersApi.createFolder({ inlineObject: folder }).then((response) => {
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
            <ConfirmForgetFolder
              onConfirm={() => handleForgetFolder(forgetFolderConfirmationOpen)}
              onCancel={() => setForgetFolderConfirmationOpen(false)}
            />
          </div>
        </Takeover>
      )}

      <div className={clsx('items-center flex flex-col gap-6 h-full px-6')}>
        <div className="container">
          <div className="py-4 flex gap-10">
            <Heading level={3}>
              {folderFormKey ? 'Add folder' : 'Your folders'}
            </Heading>
            {!folderFormKey && (
              <Button
                size="md"
                className="border-2 border-primary"
                onClick={() =>
                  void router.push({
                    pathname: router.pathname,
                    query: { add: 'true' },
                  })
                }
              >
                <Icon size="md" icon={PlusIcon} />
                Add folder
              </Button>
            )}
          </div>
          <div
            className={clsx(
              'flex flex-col items-center justify-around',
              'overflow-hidden duration-200',
              !folderFormKey ? 'h-0' : 'h-full',
            )}
          >
            <div className="bg-black/[.3] p-4 rounded w-fit">
              <>
                {s3Connections && s3Connections.length === 0 && (
                  <div className="p-4 border border-red-500 rounded-lg mb-4">
                    You have no S3 connections. You&apos;ll need at least one
                    before you can create your first folder.
                    <br />
                    <Link href="/s3-connections?add=true" className="underline">
                      Add an S3 connection now
                    </Link>
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
          <div
            className={clsx(
              'flex flex-wrap py-4 gap-6 duration-200',
              folderFormKey && 'opacity-0 ',
            )}
          >
            {folders?.map((folderAndPermission, i) => (
              <Link href={`/folders/${folderAndPermission.folder.id}`} key={i}>
                <FolderCard
                  folderAndPermission={folderAndPermission}
                  onForget={() =>
                    handleForgetFolder(folderAndPermission.folder.id)
                  }
                />
              </Link>
            ))}
          </div>
          {folders?.length === 0 && <div>No folders yet</div>}
          {!folders && <div className="animate-pulse">Loading folders...</div>}
        </div>
      </div>
    </>
  )
}
