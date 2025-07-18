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
import type { ContentMetadataType ,
  FolderDTO,
  FolderGetResponse,
  FolderObjectDTO,
} from '@stellariscloud/types'
import { MediaType } from '@stellariscloud/types'
import { Button, Card, cn } from '@stellariscloud/ui-toolkit'
import {
  extensionFromMimeType,
  formatBytes,
  toMetadataObjectIdentifier,
} from '@stellariscloud/utils'
import React from 'react'

import { $api } from '@/src/services/api'

import { ActionsList } from '../../components/actions-list/actions-list.component'
import { TasksList } from '../../components/tasks-list/tasks-list.component'
import { useLocalFileCacheContext } from '../../contexts/local-file-cache.context'
import type { IconProps } from '../../design-system/icon'
import { Icon } from '../../design-system/icon'
import { useServerContext } from '../../hooks/use-server-context'

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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [showRawMetadata, setShowRawMetadata] = React.useState(false)
  const folderId = folder.id
  const [focusedMetadata, setFocusedMetadata] = React.useState<string>()
  const [metadataContent, setMetadataContent] = React.useState<
    Record<string, string>
  >({})
  const listFolderTasksQuery = $api.useQuery(
    'get',
    '/api/v1/folders/{folderId}/tasks',
    {
      params: {
        path: { folderId },
        query: { objectKey },
      },
    },
    { enabled: !!folderId && !!objectKey },
  )
  const tasks = listFolderTasksQuery.data?.result

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
          folderObject.contentMetadata[folderObject.hash][focusedMetadata].hash,
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

  const metadata = folderObject.hash
    ? (folderObject.contentMetadata[folderObject.hash] ??
      ({} as ContentMetadataType))
    : ({} as ContentMetadataType)

  const handleAppTaskTrigger = $api.useMutation(
    'post',
    '/api/v1/folders/{folderId}/apps/{appIdentifier}/trigger/{taskKey}',
  )

  const serverContext = useServerContext()
  const actionItems: {
    id: string
    key: string
    label: string
    description: string
    icon: IconProps['icon']
    onExecute: () => void
  }[] = serverContext.appFolderObjectTaskTriggers.map((trigger) => ({
    description: trigger.taskTrigger.description,
    icon: CheckIcon,
    id: trigger.taskTrigger.taskKey,
    key: trigger.taskTrigger.taskKey,
    label: trigger.taskTrigger.label,
    onExecute: () =>
      handleAppTaskTrigger.mutate({
        params: {
          path: {
            folderId,
            taskKey: trigger.taskTrigger.taskKey,
            appIdentifier: trigger.appIdentifier,
          },
        },
        body: {
          inputParams: {},
          objectKey,
        },
      }),
  }))

  return (
    <div className="flex h-full min-w-full flex-col overflow-hidden">
      <div className="flex h-full pb-2">
        <Card className="w-full p-3">
          <div className="flex flex-1 flex-col gap-1 rounded-md bg-foreground/5 p-2">
            <div className="flex items-center gap-2">
              <Icon icon={MagnifyingGlassIcon} size="md" />
              <div className="text-lg font-bold">Object Details</div>
            </div>
          </div>

          <div className="flex flex-1 flex-col overflow-y-auto">
            <dl className="pb-6">
              <div className="mt-4 flex w-full flex-none items-center gap-x-4 px-2">
                <dt className="flex flex-none">
                  <span className="sr-only">Path</span>
                  <Icon icon={GlobeAltIcon} size="md" />
                </dt>
                <dd className={cn('overflow-hidden text-sm leading-6')}>
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
                <div className="mt-4 flex w-full flex-none items-center gap-x-4 px-2">
                  <dt className="flex flex-none">
                    <span className="sr-only">Hash</span>
                    <Icon icon={HashtagIcon} size="md" />
                  </dt>
                  <dd className={cn('text-sm leading-6')}>
                    {folderObject.hash}
                  </dd>
                </div>
              )}
              <div className="mt-4 flex w-full flex-none items-center gap-x-4 px-2">
                <dt className="flex flex-none">
                  <span className="sr-only">Folder</span>
                  <Icon icon={FolderIcon} size="md" />
                </dt>
                <dd className={cn('text-sm leading-6')}>{folder.name}</dd>
              </div>
              <div className="mt-4 flex w-full flex-none items-center gap-x-4 px-2">
                <dt className="flex flex-none">
                  <span className="sr-only">Size</span>
                  <Icon icon={CubeIcon} size="md" />
                </dt>
                <dd className={cn('text-sm leading-6')}>
                  {`${formatBytes(folderObject.sizeBytes)}`}{' '}
                  <span className="font-mono">{`(${folderObject.sizeBytes.toLocaleString()} bytes)`}</span>
                </dd>
              </div>
              {metadata.height?.content && metadata.width?.content ? (
                <div className="mt-4 flex w-full flex-none items-center gap-x-4 px-2">
                  <dt className="flex flex-none">
                    <span className="sr-only">Dimensions</span>
                    <Icon icon={TvIcon} size="md" />
                  </dt>
                  <dd className={cn('text-sm leading-6')}>
                    {metadata.width.content} x {metadata.height.content}
                  </dd>
                </div>
              ) : (
                ''
              )}
              {folderObject.mimeType && (
                <div className="mt-4 flex w-full flex-none items-center gap-x-4 px-2">
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
                  <dd className={cn('text-sm leading-6')}>
                    {folderObject.mimeType}
                  </dd>
                </div>
              )}
            </dl>
            <div className="p-4 py-1 text-xs">
              {folderObject.hash && (
                <div>
                  <div className={cn('pt-4 text-lg font-semibold')}>
                    Metadata
                  </div>
                  <ul>
                    {Object.keys(
                      folderObject.contentMetadata[folderObject.hash] ?? {},
                    ).map((metadataKey, i) => {
                      const metadataEntry =
                        folderObject.contentMetadata[folderObject.hash ?? ''][
                          metadataKey
                        ]
                      return (
                        <li key={i} className="flex flex-col">
                          <div className="flex justify-between gap-x-6 py-5">
                            <div className="flex min-w-0 items-center justify-center gap-x-4">
                              {
                                <div className="rounded-full p-4">
                                  <Icon
                                    icon={
                                      folderObject.mediaType === MediaType.Image
                                        ? PhotoIcon
                                        : folderObject.mediaType ===
                                            MediaType.Audio
                                          ? MusicalNoteIcon
                                          : DocumentTextIcon
                                    }
                                    size="md"
                                  />
                                </div>
                              }
                              <div className="min-w-0 flex-auto">
                                <p
                                  className={cn(
                                    'text-sm font-medium leading-6',
                                  )}
                                >
                                  <span className="opacity-50">key: </span>
                                  <span className="font-mono font-light">
                                    {metadataKey}
                                  </span>
                                </p>
                                <p
                                  className={cn(
                                    'truncate leading-5',
                                    'text-sm font-semibold ',
                                  )}
                                >
                                  {metadataEntry.mimeType} -{' '}
                                  {formatBytes(metadataEntry.size)} - #
                                  {metadataEntry.hash.slice(0, 8)}
                                </p>
                              </div>
                            </div>
                            <div className="flex shrink-0 gap-2 sm:flex sm:items-end">
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
                            <div className={cn('w-full')}>
                              {folderObject.mediaType ===
                                MediaType.Document && (
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
                              {folderObject.mediaType === MediaType.Image && (
                                <div className="relative min-h-[30rem] w-full">
                                  <img
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
          <div>{<ActionsList actionItems={actionItems} />}</div>
          <div>{tasks && <TasksList tasks={tasks} />}</div>
          {showRawMetadata && (
            <div className="p-4 text-xs">
              <pre className="p-6 dark:bg-white/5 dark:text-gray-200">
                {JSON.stringify(
                  {
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
