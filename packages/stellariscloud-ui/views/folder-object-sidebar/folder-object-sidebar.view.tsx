import { EyeIcon } from '@heroicons/react/20/solid'
import {
  ArrowDownTrayIcon,
  ArrowPathIcon,
  BeakerIcon,
  BoltIcon,
  BookOpenIcon,
  CubeIcon,
  DocumentIcon,
  FolderIcon,
  GlobeAltIcon,
  HashtagIcon,
  MagnifyingGlassIcon,
  QuestionMarkCircleIcon,
  TvIcon,
} from '@heroicons/react/24/outline'
import type {
  FolderAndPermission,
  FolderData,
  FolderObjectData,
} from '@stellariscloud/api-client'
import { FolderOperationName, MediaType } from '@stellariscloud/api-client'
import { Icon } from '@stellariscloud/design-system'
import {
  extensionFromMimeType,
  formatBytes,
  toMetadataObjectIdentifier,
} from '@stellariscloud/utils'
import clsx from 'clsx'
import React from 'react'

import { useLocalFileCacheContext } from '../../contexts/local-file-cache.context'
import { Button } from '../../design-system/button/button'
import type { IconProps } from '../../design-system/icon'
import { foldersApi } from '../../services/api'

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
  const { downloadToFile } = useLocalFileCacheContext()
  const [tab, setTab] = React.useState('metadata')
  const tabs: { id: string; name: string; icon?: IconProps['icon'] }[] = [
    { id: 'metadata', name: 'Metadata', icon: BookOpenIcon },
    { id: 'actions', name: 'Actions', icon: BeakerIcon },
    { id: 'tasks', name: 'Tasks', icon: BoltIcon },
    { id: 'metadata_raw', name: 'Raw', icon: MagnifyingGlassIcon },
  ]
  const folderId = folder.id

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
        'Index basic attributes of the object and generate preview media',
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
    <div className="p-2">
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
          className="isolate flex divide-x divide-gray-200 rounded-lg shadow"
          aria-label="Tabs"
        >
          {tabs.map((t, tabIdx) => (
            <button
              key={t.id}
              // href={`./${t.id}`}
              onClick={() => setTab(t.id)}
              className={clsx(
                tab === t.id
                  ? 'text-gray-900'
                  : 'text-gray-500 hover:text-gray-700',
                tabIdx === 0 ? 'rounded-l-lg' : '',
                tabIdx === tabs.length - 1 ? 'rounded-r-lg' : '',
                'group relative min-w-0 flex-1 overflow-hidden bg-white py-4 px-4 text-center text-sm font-medium hover:bg-gray-50 focus:z-10',
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
      {tab === 'metadata' && (
        <>
          <dl className="border-b border-gray-900/5 pb-6 pt-2">
            <div className="mt-4 flex w-full items-center flex-none gap-x-4 px-6">
              <dt className="flex-none flex">
                <span className="sr-only">Path</span>
                <Icon icon={GlobeAltIcon} size="md" className="text-gray-500" />
              </dt>
              <dd className="text-sm leading-6 text-gray-700">
                {folder.endpoint}
                {folder.endpoint.endsWith('/') ? '' : '/'}
                {folder.bucket}
                {folder.bucket.endsWith('/') ? '' : '/'}
                {folder.prefix}
                {folderObject.objectKey}
              </dd>
            </div>
            <div className="mt-4 flex w-full items-center flex-none gap-x-4 px-6">
              <dt className="flex-none flex">
                <span className="sr-only">Hash</span>
                <Icon icon={HashtagIcon} size="md" className="text-gray-500" />
              </dt>
              <dd className="text-sm leading-6 text-gray-700">
                {folderObject.hash}
              </dd>
            </div>
            <div className="mt-4 flex w-full items-center flex-none gap-x-4 px-6">
              <dt className="flex-none flex">
                <span className="sr-only">Folder</span>
                <Icon icon={FolderIcon} size="md" className="text-gray-500" />
              </dt>
              <dd className="text-sm leading-6 text-gray-700">{folder.name}</dd>
            </div>
            <div className="mt-4 flex w-full items-center flex-none gap-x-4 px-6">
              <dt className="flex-none flex">
                <span className="sr-only">Size</span>
                <Icon icon={CubeIcon} size="md" className="text-gray-500" />
              </dt>
              <dd className="text-sm leading-6 text-gray-700">
                {`${formatBytes(folderObject.sizeBytes)}`}{' '}
                <span className="font-mono">{`(${folderObject.sizeBytes} bytes)`}</span>
              </dd>
            </div>
            <div className="mt-4 flex w-full items-center flex-none gap-x-4 px-6">
              <dt className="flex-none flex">
                <span className="sr-only">Dimensions</span>
                <Icon icon={TvIcon} size="md" className="text-gray-500" />
              </dt>
              <dd className="text-sm leading-6 text-gray-700">
                {attributes.width} x {attributes.height}
              </dd>
            </div>
            <div className="mt-4 flex w-full items-center flex-none gap-x-4 px-6">
              <dt className="flex-none">
                <span className="sr-only">Status</span>
                <Icon
                  icon={QuestionMarkCircleIcon}
                  size="md"
                  className="text-gray-500"
                />
              </dt>
              <dd className="text-sm leading-6 text-gray-700">
                {attributes.mimeType}
              </dd>
            </div>
          </dl>
          <div className="text-xs p-4 py-1">
            {folderObject.hash && (
              <ul className="divide-y divide-gray-100">
                {Object.keys(
                  folderObject.contentMetadata[folderObject.hash] ?? {},
                ).map((metadataKey, i) => {
                  const metadataEntry =
                    folderObject.contentMetadata[folderObject.hash ?? '']?.[
                      metadataKey
                    ]
                  if (!metadataEntry) {
                    return <></>
                  }
                  return (
                    <li key={i} className="flex justify-between gap-x-6 py-5">
                      <div className="flex items-center jsutify-center min-w-0 gap-x-4">
                        {
                          <div className="bg-gray-100 p-4 rounded-full text-gray-400 border-gray-300 border">
                            <Icon icon={DocumentIcon} size="md" />
                          </div>
                        }
                        <div className="min-w-0 flex-auto">
                          <p className="text-sm font-semibold leading-6 text-gray-500">
                            metadata: <i>{metadataKey}</i>
                          </p>
                          <p className="text-sm font-semibold leading-6 text-gray-700">
                            #{metadataEntry.hash.slice(0, 8)}
                          </p>
                          <p className="mt-1 truncate text-xs leading-5 text-gray-700">
                            {metadataEntry.mimeType} -{' '}
                            {formatBytes(metadataEntry.size)}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2 hidden shrink-0 sm:flex sm:items-end">
                        <Button
                          onClick={() =>
                            downloadToFile(
                              folderObject.folder.id,
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
                            icon={EyeIcon}
                            size="md"
                            className="text-gray-500"
                          />
                        </Button>
                        <Button
                          onClick={() =>
                            downloadToFile(
                              folderObject.folder.id,
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
                            size="md"
                            className="text-gray-500"
                          />
                        </Button>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </>
      )}
      {tab === 'actions' && (
        <ul className="space-y-3 mt-4 px-2">
          {actionItems.map((actionItem) => (
            <li
              key={actionItem.id}
              className="overflow-hidden rounded-md bg-white p-4 shadow"
            >
              <div className="flex items-start">
                <div className="flex flex-col text-gray-700 flex-1">
                  <div className="text-lg font-semibold">
                    {actionItem.label}
                  </div>
                  <div className="text-sm">{actionItem.description}</div>
                </div>
                <div className="shrink-0">
                  <Button onClick={actionItem.onExecute}>Run</Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
      {tab === 'Tasks' && (
        <div className="text-xs p-4">
          <pre>
            {JSON.stringify(
              {
                contentAttributes: folderObject.contentAttributes,
                contenteMetadata: folderObject.contentMetadata,
              },
              null,
              2,
            )}
          </pre>
        </div>
      )}{' '}
      {tab === 'metadata_raw' && (
        <div className="text-xs p-4">
          <pre>
            {JSON.stringify(
              {
                contentAttributes: folderObject.contentAttributes,
                contenteMetadata: folderObject.contentMetadata,
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
