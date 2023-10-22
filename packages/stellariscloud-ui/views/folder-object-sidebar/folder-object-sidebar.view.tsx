import {
  ArrowDownTrayIcon,
  ArrowPathIcon,
  BeakerIcon,
  BookOpenIcon,
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
import type {
  FolderAndPermission,
  FolderData,
  FolderObjectData,
} from '@stellariscloud/api-client'
import { FolderOperationName } from '@stellariscloud/api-client'
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
import { Button } from '../../design-system/button/button'
import type { IconProps } from '../../design-system/icon'
import { Icon } from '../../design-system/icon'
import { foldersApi } from '../../services/api'

const MAIN_TEXT_COLOR = 'text-gray-500 dark:text-gray-400'
const MAIN_ICON_COLOR = 'text-gray-500'

export const FolderObjectSidebar = ({
  folder,
  folderObject,
  objectKey,
}: {
  folder: FolderData
  folderObject: FolderObjectData
  objectKey: string
  folderAndPermission?: FolderAndPermission
}) => {
  const { downloadToFile, getData } = useLocalFileCacheContext()
  const [tab, setTab] = React.useState('overview')
  const tabs: { id: string; name: string; icon?: IconProps['icon'] }[] = [
    { id: 'overview', name: 'Overview', icon: BookOpenIcon },
    { id: 'actions', name: 'Actions', icon: BeakerIcon },
    // { id: 'tasks', name: 'Tasks', icon: BoltIcon },
    // { id: 'metadata_raw', name: 'Raw', icon: MagnifyingGlassIcon },
  ]
  const folderId = folder.id
  const [focusedMetadata, setFocusedMetadata] = React.useState<string>()
  const [metadataContent, setMetadataContent] = React.useState<{
    [key: string]: string
  }>({})

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

  const handleIndexFolderObject = () => {
    void foldersApi.enqueueFolderOperation({
      folderId,
      folderOperationRequestPayload: {
        operationName: FolderOperationName.IndexFolderObject,
        operationData: {
          folderId,
          objectKey,
        },
      },
    })
  }

  const handleTranscribe = () => {
    void foldersApi.enqueueFolderOperation({
      folderId,
      folderOperationRequestPayload: {
        operationName: FolderOperationName.TranscribeAudio,
        operationData: {
          folderId,
          objectKey,
        },
      },
    })
  }

  const handleDetectObjects = () => {
    void foldersApi.enqueueFolderOperation({
      folderId,
      folderOperationRequestPayload: {
        operationName: FolderOperationName.DetectObjects,
        operationData: {
          folderId,
          objectKey,
        },
      },
    })
  }
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
  }[] = [
    {
      id: 'index',
      label: 'Index content',
      description:
        'Resolve basic attributes of the object and generate preview media',
      icon: ArrowPathIcon,
      onExecute: handleIndexFolderObject,
    },
    ...(folderObject.mediaType === MediaType.Image
      ? [
          {
            id: 'detect_objects',
            label: 'Detect objects',
            description: 'Use AI to detect objects in the image',
            icon: ArrowPathIcon,
            onExecute: handleDetectObjects,
          },
        ]
      : []),
    ...(folderObject.mediaType === MediaType.Audio
      ? [
          {
            id: 'transcribe',
            label: 'Transcribe audio',
            description: 'Use AI to transcribe the audio track',
            icon: ArrowPathIcon,
            onExecute: handleTranscribe,
          },
        ]
      : []),
  ]

  return (
    <div className="h-full px-1 flex flex-col bg-gray-50 dark:bg-gray-600/5 h-full">
      <div className="sm:hidden">
        <label htmlFor="tabs" className="sr-only">
          Select a tab
        </label>
        {/* Use an "onChange" listener to redirect the user to the selected tab URL. */}
        <select
          id="tabs"
          name="tabs"
          className="block w-full rounded-md border-gray-300 focus:border-indigo-500 focus:ring-indigo-500"
        >
          {tabs.map((t) => (
            <option key={t.name}>{t.name}</option>
          ))}
        </select>
      </div>
      <div className="hidden sm:block">
        <nav
          className="isolate flex divide-x divide-gray-200 dark:divide-gray-200/10 rounded-lg shadow"
          aria-label="Tabs"
        >
          {tabs.map((t, tabIdx) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={clsx(
                tab === t.id
                  ? 'text-gray-900 dark:text-gray-300'
                  : `text-gray-400 hover:text-gray-500`,
                tabIdx === 0 ? 'rounded-l-lg' : '',
                tabIdx === tabs.length - 1 ? 'rounded-r-lg' : '',
                'group relative min-w-0 flex-1 overflow-hidden bg-white dark:bg-white/5 py-4 px-4 text-center text-sm font-medium hover:bg-gray-50 focus:z-10',
              )}
              aria-current={t.id === tab ? 'page' : undefined}
            >
              <div className="flex items-center gap-2">
                {t.icon && <Icon size="sm" icon={t.icon} />}
                {t.name && <span>{t.name}</span>}
              </div>
              <span
                aria-hidden="true"
                className={clsx(
                  t.id === tab ? 'bg-indigo-500' : 'bg-transparent',
                  'absolute inset-x-0 bottom-0 h-0.5',
                )}
              />
            </button>
          ))}
        </nav>
      </div>
      {tab === 'overview' && (
        <div className="flex-1 flex flex-col overflow-y-auto mt-4">
          <dl className="border-b border-gray-900/5 dark:border-gray-800 pb-6 pt-2">
            <div className="mt-4 flex w-full items-center flex-none gap-x-4 px-6">
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
                {folderObject.objectKey}
              </dd>
            </div>
            {folderObject.hash && (
              <div className="mt-4 flex w-full items-center flex-none gap-x-4 px-6">
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
            <div className="mt-4 flex w-full items-center flex-none gap-x-4 px-6">
              <dt className="flex-none flex">
                <span className="sr-only">Folder</span>
                <Icon icon={FolderIcon} size="md" className={MAIN_ICON_COLOR} />
              </dt>
              <dd className={clsx('text-sm leading-6', MAIN_TEXT_COLOR)}>
                {folder.name}
              </dd>
            </div>
            <div className="mt-4 flex w-full items-center flex-none gap-x-4 px-6">
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
              <div className="mt-4 flex w-full items-center flex-none gap-x-4 px-6">
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
              <div className="mt-4 flex w-full items-center flex-none gap-x-4 px-6">
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
      )}
      {tab === 'actions' && (
        <ul className="space-y-3 mt-4 px-2">
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
      )}
      {tab === 'metadata_raw' && (
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
