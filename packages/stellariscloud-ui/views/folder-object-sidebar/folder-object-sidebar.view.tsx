import {
  ArrowDownTrayIcon,
  ArrowPathIcon,
  BeakerIcon,
  BookOpenIcon,
  CheckIcon,
  CubeIcon,
  DocumentTextIcon,
  EyeIcon,
  EyeSlashIcon,
  FolderIcon,
  GlobeAltIcon,
  HashtagIcon,
  MusicalNoteIcon,
  PhotoIcon,
  QuestionMarkCircleIcon,
  TvIcon,
  VideoCameraIcon,
} from '@heroicons/react/24/outline'
import { AppAction, MediaType } from '@stellariscloud/types'
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
import { Button } from '../../design-system/button/button'
import type { IconProps } from '../../design-system/icon'
import { Icon } from '../../design-system/icon'
import { apiClient } from '../../services/api'
import { FolderDTO } from '@stellariscloud/api-client'
import { FolderObjectDTO } from '@stellariscloud/api-client'
import { FolderGetResponse } from '@stellariscloud/api-client'
import { useServerContext } from '../../contexts/server.context'
import { Heading } from '../../design-system/typography'

const MAIN_TEXT_COLOR = 'text-gray-500 dark:text-gray-400'
const MAIN_ICON_COLOR = 'text-gray-500'

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
    label: string
    description: string
    icon: IconProps['icon']
    onExecute: () => void
  }[] = serverContext.appFolderActions.map(({ action, appIdentifier }) => ({
    description: action.description,
    icon: CheckIcon,
    id: action.key,
    label: action.key,
    onExecute: () =>
      apiClient.foldersApi.handleFolderAction({
        folderId,
        actionKey: action.key,
        appIdentifier,
        folderHandleActionInputDTO: {
          actionParams: {},
          objectKey,
        },
      }),
  }))

  return (
    <div className="px-1 flex flex-col bg-gray-50 dark:bg-gray-600/5 text-gray-400">
      <div className="mt-4 px-2 flex flex-col gap-2">
        <Heading level={6}>Details</Heading>
        <div className="flex-1 flex flex-col overflow-y-auto">
          <dl className="border-b border-gray-900/5 dark:border-gray-800 pb-6">
            <div className="mt-4 flex w-full items-center flex-none gap-x-4 px-2">
              <dt className="flex-none flex">
                <span className="sr-only">Path</span>
                <Icon
                  icon={GlobeAltIcon}
                  size="md"
                  className={clsx(MAIN_ICON_COLOR)}
                />
              </dt>
              <dd className={clsx('text-sm leading-6', MAIN_TEXT_COLOR)}>
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
                  <Icon
                    icon={HashtagIcon}
                    size="md"
                    className={MAIN_ICON_COLOR}
                  />
                </dt>
                <dd className={clsx('text-sm leading-6', MAIN_TEXT_COLOR)}>
                  {folderObject.hash}
                </dd>
              </div>
            )}
            <div className="mt-4 flex w-full items-center flex-none gap-x-4 px-2">
              <dt className="flex-none flex">
                <span className="sr-only">Folder</span>
                <Icon icon={FolderIcon} size="md" className={MAIN_ICON_COLOR} />
              </dt>
              <dd className={clsx('text-sm leading-6', MAIN_TEXT_COLOR)}>
                {folder.name}
              </dd>
            </div>
            <div className="mt-4 flex w-full items-center flex-none gap-x-4 px-2">
              <dt className="flex-none flex">
                <span className="sr-only">Size</span>
                <Icon icon={CubeIcon} size="md" className={MAIN_ICON_COLOR} />
              </dt>
              <dd className={clsx('text-sm leading-6', MAIN_TEXT_COLOR)}>
                {`${formatBytes(folderObject.sizeBytes)}`}{' '}
                <span className="font-mono">{`(${folderObject.sizeBytes.toLocaleString()} bytes)`}</span>
              </dd>
            </div>
            {attributes.height && attributes.width ? (
              <div className="mt-4 flex w-full items-center flex-none gap-x-4 px-2">
                <dt className="flex-none flex">
                  <span className="sr-only">Dimensions</span>
                  <Icon icon={TvIcon} size="md" className={MAIN_ICON_COLOR} />
                </dt>
                <dd className={clsx('text-sm leading-6', MAIN_TEXT_COLOR)}>
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
                    className={MAIN_ICON_COLOR}
                  />
                </dt>
                <dd className={clsx('text-sm leading-6', MAIN_TEXT_COLOR)}>
                  {attributes.mimeType}
                </dd>
              </div>
            )}
          </dl>
          <div className="text-xs p-4 py-1">
            {folderObject.hash && (
              <div>
                <div
                  className={clsx(
                    'pt-4 text-lg font-semibold',
                    MAIN_TEXT_COLOR,
                  )}
                >
                  Metadata
                </div>
                <ul className="divide-y divide-gray-100 dark:divide-gray-700">
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
                              <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-full text-gray-400">
                                <Icon
                                  icon={
                                    mediaType === MediaType.Image
                                      ? PhotoIcon
                                      : mediaType === MediaType.Audio
                                        ? MusicalNoteIcon
                                        : DocumentTextIcon
                                  }
                                  size="md"
                                  className={clsx('text-gray-400')}
                                />
                              </div>
                            }
                            <div className="min-w-0 flex-auto">
                              <p
                                className={clsx(
                                  'text-sm font-medium leading-6',
                                  MAIN_TEXT_COLOR,
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
                                  MAIN_TEXT_COLOR,
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
                          <div className={clsx('w-full', MAIN_TEXT_COLOR)}>
                            {mediaType === MediaType.Document && (
                              <pre className="">
                                {metadataContent[metadataKey] &&
                                  Buffer.from(
                                    metadataContent[metadataKey].substring(29),
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
      </div>
      <div className="px-2 pt-2 flex flex-col gap-4">
        <Heading level={6}>Actions</Heading>
        <ul className="space-y-3">
          {actionItems.map((actionItem) => (
            <li
              key={actionItem.id}
              className="overflow-hidden rounded-md bg-white dark:bg-white/5 p-4 shadow"
            >
              <div className="flex items-start">
                <div className="flex flex-col text-gray-700 dark:text-gray-300 flex-1">
                  <div className="text-lg font-semibold">
                    {actionItem.label}
                  </div>
                  <div className="text-sm text-gray-700 dark:text-gray-400">
                    {actionItem.description}
                  </div>
                </div>
                <div className="shrink-0">
                  <Button
                    primary
                    onClick={actionItem.onExecute}
                    className="dark:text-gray-200"
                  >
                    Run
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
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
    </div>
  )
}
