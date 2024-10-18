import {
  ArrowDownTrayIcon,
  CheckIcon,
  CubeIcon,
  DocumentTextIcon,
  EyeIcon,
  EyeSlashIcon,
  FolderIcon,
  GlobeAltIcon,
  HashtagIcon,
  MagnifyingGlassIcon,
  MusicalNoteIcon,
  PhotoIcon,
  QuestionMarkCircleIcon,
  TvIcon,
  VideoCameraIcon,
} from '@heroicons/react/24/outline'
import { MediaType } from '@stellariscloud/types'
import {
  extensionFromMimeType,
  formatBytes,
  mediaTypeFromMimeType,
  toMetadataObjectIdentifier,
} from '@stellariscloud/utils'
import clsx from 'clsx'
import Image from 'next/image'
import React from 'react'

import { useLocalFileCacheContext } from '../../contexts/local-file-cache.context'
import type { IconProps } from '../../design-system/icon'
import { Icon } from '../../design-system/icon'
import { apiClient } from '../../services/api'
import { FolderDTO, TaskDTO } from '@stellariscloud/api-client'
import { FolderObjectDTO } from '@stellariscloud/api-client'
import { FolderGetResponse } from '@stellariscloud/api-client'
import { useServerContext } from '../../contexts/server.context'
import { Button, Card } from '@stellariscloud/ui-toolkit'
import { ActionsList } from '../../components/actions-list/actions-list.component'
import { TasksList } from '../../components/tasks-list/tasks-list.component'

export const FolderObjectSidebar = ({
  folder,
  folderObject,
  objectKey,
}: {
  folder: FolderDTO
  folderObject: FolderObjectDTO
  objectKey: string
  folderAndPermission?: FolderGetResponse
}) => {
  const { downloadToFile, getData } = useLocalFileCacheContext()
  const [showRawMetadata, setShowRawMetadata] = React.useState(false)
  const folderId = folder.id
  const [focusedMetadata, setFocusedMetadata] = React.useState<string>()
  const [metadataContent, setMetadataContent] = React.useState<{
    [key: string]: string
  }>({})
  const [tasks, setTasks] = React.useState<TaskDTO[]>()

  const fetchTasks = React.useCallback(() => {
    if (folder?.id) {
      void apiClient.tasksApi
        .listTasks({ folderId: folder?.id, objectKey })
        .then((resp) => setTasks(resp.data.result))
    }
  }, [folder?.id])

  React.useEffect(() => {
    if (folder?.id && objectKey) {
      void fetchTasks()
    }
  }, [folder?.id, objectKey])

  const serverContext = useServerContext()

  React.useEffect(() => {
    if (
      focusedMetadata &&
      folderObject.hash &&
      !(focusedMetadata in metadataContent)
    ) {
      void getData(
        folderId,
        toMetadataObjectIdentifier(
          objectKey,
          folderObject.contentMetadata[folderObject.hash]?.[focusedMetadata]
            ?.hash ?? '',
        ),
      ).then((result) => {
        setMetadataContent((mc) => ({
          ...mc,
          [focusedMetadata]: result?.dataURL ?? '',
        }))
      })
    }
  }, [
    focusedMetadata,
    folderId,
    folderObject.contentMetadata,
    folderObject.hash,
    getData,
    metadataContent,
    objectKey,
  ])

  const attributes = folderObject.hash
    ? folderObject.contentAttributes[folderObject.hash] ??
      ({} as { [key: string]: string })
    : ({} as { [key: string]: string })

  const actionItems: {
    id: string
    key: string
    label: string
    description: string
    icon: IconProps['icon']
    onExecute: () => void
  }[] = serverContext.appFolderObjectTaskTriggers.map(
    ({ taskTrigger, appIdentifier }) => ({
      description: taskTrigger.description,
      icon: CheckIcon,
      id: taskTrigger.taskKey,
      key: taskTrigger.taskKey,
      label: taskTrigger.label,
      onExecute: () =>
        apiClient.foldersApi.handleAppTaskTrigger({
          folderId,
          taskKey: taskTrigger.taskKey,
          appIdentifier,
          triggerAppTaskInputDTO: {
            inputParams: {},
            objectKey,
          },
        }),
    }),
  )

  return (
    <div className="h-full min-w-full flex flex-col overflow-hidden">
      <div className="h-full flex pb-2 px-2">
        <Card className="p-3 w-full">
          <div className="flex flex-col flex-1 gap-1 bg-foreground/5 p-2 rounded-md">
            <div className="flex items-center gap-2">
              <Icon icon={MagnifyingGlassIcon} size="md" />
              <div className="text-lg font-bold">Object Details</div>
            </div>
          </div>

          <div className="flex-1 flex flex-col overflow-y-auto">
            <dl className="pb-6">
              <div className="mt-4 flex w-full items-center flex-none gap-x-4 px-2">
                <dt className="flex-none flex">
                  <span className="sr-only">Path</span>
                  <Icon icon={GlobeAltIcon} size="md" />
                </dt>
                <dd className={clsx('text-sm leading-6 overflow-hidden')}>
                  {folder.contentLocation.endpoint}
                  {folder.contentLocation.endpoint.endsWith('/') ? '' : '/'}
                  {folder.contentLocation.bucket}
                  {folder.contentLocation.bucket.endsWith('/') ? '' : '/'}
                  {folder.contentLocation.prefix}
                  {folder.contentLocation.prefix?.endsWith('/') ? '' : '/'}
                  {folderObject.objectKey}
                </dd>
              </div>
              {folderObject.hash && (
                <div className="mt-4 flex w-full items-center flex-none gap-x-4 px-2">
                  <dt className="flex-none flex">
                    <span className="sr-only">Hash</span>
                    <Icon icon={HashtagIcon} size="md" />
                  </dt>
                  <dd className={clsx('text-sm leading-6')}>
                    {folderObject.hash}
                  </dd>
                </div>
              )}
              <div className="mt-4 flex w-full items-center flex-none gap-x-4 px-2">
                <dt className="flex-none flex">
                  <span className="sr-only">Folder</span>
                  <Icon icon={FolderIcon} size="md" />
                </dt>
                <dd className={clsx('text-sm leading-6')}>{folder.name}</dd>
              </div>
              <div className="mt-4 flex w-full items-center flex-none gap-x-4 px-2">
                <dt className="flex-none flex">
                  <span className="sr-only">Size</span>
                  <Icon icon={CubeIcon} size="md" />
                </dt>
                <dd className={clsx('text-sm leading-6')}>
                  {`${formatBytes(folderObject.sizeBytes)}`}{' '}
                  <span className="font-mono">{`(${folderObject.sizeBytes.toLocaleString()} bytes)`}</span>
                </dd>
              </div>
              {attributes.height && attributes.width ? (
                <div className="mt-4 flex w-full items-center flex-none gap-x-4 px-2">
                  <dt className="flex-none flex">
                    <span className="sr-only">Dimensions</span>
                    <Icon icon={TvIcon} size="md" />
                  </dt>
                  <dd className={clsx('text-sm leading-6')}>
                    {attributes.width} x {attributes.height}
                  </dd>
                </div>
              ) : (
                ''
              )}
              {attributes.mimeType && (
                <div className="mt-4 flex w-full items-center flex-none gap-x-4 px-2">
                  <dt className="flex-none">
                    <span className="sr-only">Status</span>
                    <Icon
                      icon={
                        folderObject.mediaType === MediaType.Audio
                          ? MusicalNoteIcon
                          : folderObject.mediaType === MediaType.Image
                            ? PhotoIcon
                            : folderObject.mediaType === MediaType.Video
                              ? VideoCameraIcon
                              : folderObject.mediaType === MediaType.Document
                                ? DocumentTextIcon
                                : QuestionMarkCircleIcon
                      }
                      size="md"
                    />
                  </dt>
                  <dd className={clsx('text-sm leading-6')}>
                    {attributes.mimeType}
                  </dd>
                </div>
              )}
            </dl>
            <div className="text-xs p-4 py-1">
              {folderObject.hash && (
                <div>
                  <div className={clsx('pt-4 text-lg font-semibold')}>
                    Metadata
                  </div>
                  <ul>
                    {Object.keys(
                      folderObject.contentMetadata[folderObject.hash] ?? {},
                    ).map((metadataKey, i) => {
                      const metadataEntry =
                        folderObject.contentMetadata[folderObject.hash ?? '']?.[
                          metadataKey
                        ]
                      const mediaType =
                        metadataEntry &&
                        mediaTypeFromMimeType(metadataEntry.mimeType)
                      if (!metadataEntry) {
                        return <></>
                      }
                      return (
                        <li key={i} className="flex flex-col">
                          <div className="flex justify-between gap-x-6 py-5">
                            <div className="flex items-center justify-center min-w-0 gap-x-4">
                              {
                                <div className="p-4 rounded-full">
                                  <Icon
                                    icon={
                                      mediaType === MediaType.Image
                                        ? PhotoIcon
                                        : mediaType === MediaType.Audio
                                          ? MusicalNoteIcon
                                          : DocumentTextIcon
                                    }
                                    size="md"
                                  />
                                </div>
                              }
                              <div className="min-w-0 flex-auto">
                                <p
                                  className={clsx(
                                    'text-sm font-medium leading-6',
                                  )}
                                >
                                  <span className="opacity-50">key: </span>
                                  <span className="font-mono font-light">
                                    {metadataKey}
                                  </span>
                                </p>
                                <p
                                  className={clsx(
                                    'truncate text-xs leading-5',
                                    'text-sm font-semibold ',
                                  )}
                                >
                                  {metadataEntry.mimeType} -{' '}
                                  {formatBytes(metadataEntry.size)} - #
                                  {metadataEntry.hash.slice(0, 8)}
                                </p>
                              </div>
                            </div>
                            <div className="flex gap-2 hidden shrink-0 sm:flex sm:items-end">
                              <Button
                                size="sm"
                                className="dark:bg-gray-50/5"
                                onClick={() =>
                                  setFocusedMetadata(
                                    metadataKey === focusedMetadata
                                      ? undefined
                                      : metadataKey,
                                  )
                                }
                              >
                                <Icon
                                  icon={
                                    focusedMetadata === metadataKey
                                      ? EyeSlashIcon
                                      : EyeIcon
                                  }
                                  size="sm"
                                  className="text-gray-400"
                                />
                              </Button>
                              <Button
                                size="sm"
                                className="dark:bg-gray-50/5"
                                onClick={() =>
                                  downloadToFile(
                                    folderObject.folderId,
                                    toMetadataObjectIdentifier(
                                      objectKey,
                                      metadataEntry.hash,
                                    ),
                                    `${metadataKey}-${metadataEntry.hash.slice(
                                      0,
                                      8,
                                    )}.${extensionFromMimeType(
                                      metadataEntry.mimeType,
                                    )}`,
                                  )
                                }
                              >
                                <Icon
                                  icon={ArrowDownTrayIcon}
                                  size="sm"
                                  className="text-gray-400"
                                />
                              </Button>
                            </div>
                          </div>
                          {focusedMetadata === metadataKey && (
                            <div className={clsx('w-full')}>
                              {mediaType === MediaType.Document && (
                                <pre className="">
                                  {metadataContent[metadataKey] &&
                                    Buffer.from(
                                      metadataContent[metadataKey].substring(
                                        29,
                                      ),
                                      'base64',
                                    ).toString()}
                                </pre>
                              )}
                              {mediaType === MediaType.Image && (
                                <div className="relative w-full min-h-[30rem]">
                                  <Image
                                    fill
                                    className="object-contain"
                                    alt={`Metadata: ${metadataKey}`}
                                    src={metadataContent[metadataKey]}
                                  />
                                </div>
                              )}
                            </div>
                          )}
                        </li>
                      )
                    })}
                  </ul>
                </div>
              )}
            </div>
          </div>
          <div>{actionItems && <ActionsList actionItems={actionItems} />}</div>
          <div>{tasks && <TasksList tasks={tasks} />}</div>
          {showRawMetadata && (
            <div className="text-xs p-4">
              <pre className="p-6 dark:bg-white/5 dark:text-gray-200">
                {JSON.stringify(
                  {
                    contentAttributes: folderObject.contentAttributes,
                    contentMetadata: folderObject.contentMetadata,
                  },
                  null,
                  2,
                )}
              </pre>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
