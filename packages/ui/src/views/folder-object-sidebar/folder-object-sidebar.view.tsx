import type {
  ContentMetadataType,
  FolderDTO,
  FolderGetResponse,
  FolderObjectDTO,
} from '@stellariscloud/types'
import { MediaType } from '@stellariscloud/types'
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  cn,
  TypographyH3,
} from '@stellariscloud/ui-toolkit'
import {
  extensionFromMimeType,
  formatBytes,
  mediaTypeFromMimeType,
  toMetadataObjectIdentifier,
} from '@stellariscloud/utils'
import {
  Box,
  Download,
  File,
  FileJson,
  FileQuestion,
  FileTextIcon,
  FolderIcon,
  Globe,
  HashIcon,
  Image,
  ImageIcon,
  ListChecks,
  MusicIcon,
  ScrollText,
  Search,
  TvIcon,
  VideoIcon,
} from 'lucide-react'

import { TasksList } from '@/src/components/tasks-list/tasks-list.component'
import { useLocalFileCacheContext } from '@/src/contexts/local-file-cache.context'
import { useServerContext } from '@/src/hooks/use-server-context'
import { $api, $apiClient } from '@/src/services/api'
import { AppUI } from '@/src/views/app-ui/app-ui.view'
const protocol = window.location.protocol
const hostname = window.location.hostname
const port = window.location.port
const API_HOST = `${hostname}${port ? `:${port}` : ''}`

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
  const { downloadToFile } = useLocalFileCacheContext()
  const folderId = folder.id
  const serverContext = useServerContext()
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

  const metadata = folderObject.hash
    ? (folderObject.contentMetadata[folderObject.hash] ??
      ({} as ContentMetadataType))
    : ({} as ContentMetadataType)

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="vertical-scrollbar-container flex flex-1 flex-col gap-4 overflow-y-auto">
        <Card className="shrink-0">
          <CardHeader className="p-4 pt-3">
            <TypographyH3>
              <div className="flex items-center gap-2">
                <Search className="size-6" />
                Object details
              </div>
            </TypographyH3>
          </CardHeader>
          <CardContent>
            <dl className="flex flex-col gap-2">
              <div className="flex flex-col gap-3">
                <div className="flex w-full flex-none items-center gap-x-4">
                  <dt className="flex flex-none">
                    <span className="sr-only">Path</span>
                    <Globe className="size-5" />
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
                  <div className="flex w-full flex-none items-center gap-x-4">
                    <dt className="flex flex-none">
                      <span className="sr-only">Hash</span>
                      <HashIcon className="size-5" />
                    </dt>
                    <dd className={cn('text-sm leading-6')}>
                      {folderObject.hash}
                    </dd>
                  </div>
                )}
                <div className="flex w-full flex-none items-center gap-x-4">
                  <dt className="flex flex-none">
                    <span className="sr-only">Folder</span>
                    <FolderIcon className="size-5" />
                  </dt>
                  <dd className={cn('text-sm leading-6')}>{folder.name}</dd>
                </div>
                <div className="flex w-full flex-none items-center gap-x-4">
                  <dt className="flex flex-none">
                    <span className="sr-only">Size</span>
                    <Box className="size-5" />
                  </dt>
                  <dd className={cn('text-sm leading-6')}>
                    {`${formatBytes(folderObject.sizeBytes)}`}{' '}
                    <span className="font-mono">{`(${folderObject.sizeBytes.toLocaleString()} bytes)`}</span>
                  </dd>
                </div>
                {metadata.width?.type === 'inline' &&
                metadata.height?.type === 'inline' &&
                metadata.height.content &&
                metadata.width.content ? (
                  <div className="flex w-full flex-none items-center gap-x-4">
                    <dt className="flex flex-none">
                      <span className="sr-only">Dimensions</span>
                      <TvIcon className="size-5" />
                    </dt>
                    <dd className={cn('text-sm leading-6')}>
                      {metadata.width.content} x {metadata.height.content}
                    </dd>
                  </div>
                ) : (
                  ''
                )}
                {folderObject.mimeType && (
                  <div className="flex w-full flex-none items-center gap-x-4">
                    <dt className="flex-none">
                      <span className="sr-only">Status</span>
                      {folderObject.mediaType === MediaType.Audio ? (
                        <MusicIcon className="size-5" />
                      ) : folderObject.mediaType === MediaType.Image ? (
                        <ImageIcon className="size-5" />
                      ) : folderObject.mediaType === MediaType.Video ? (
                        <VideoIcon className="size-5" />
                      ) : folderObject.mediaType === MediaType.Document ? (
                        <FileTextIcon className="size-5" />
                      ) : (
                        <FileQuestion className="size-5" />
                      )}
                    </dt>
                    <dd className={cn('text-sm leading-6')}>
                      {folderObject.mimeType}
                    </dd>
                  </div>
                )}
              </div>
            </dl>
          </CardContent>
        </Card>
        {serverContext.objectSidebarEmbedContributions.map((embed) => {
          const url = embed.path
            .replace('{folderId}', folderId)
            .replace('{objectKey}', objectKey)
          const getAccessTokens = () =>
            $apiClient
              .POST('/api/v1/server/apps/{appIdentifier}/user-access-token', {
                params: { path: { appIdentifier: embed.appIdentifier } },
              })
              .then((res) => {
                if (!res.data) {
                  throw new Error('Failed to generate app access token')
                }
                return res.data.session
              })
          return (
            <Card
              className="shrink-0"
              key={`${embed.appIdentifier}:${embed.uiIdentifier}:${embed.path}`}
            >
              <CardHeader className="p-4 pt-3">
                <TypographyH3>
                  <div className="flex items-center gap-2">
                    <img
                      src={`${protocol}//${embed.uiIdentifier}.${embed.appIdentifier}.apps.${API_HOST}${embed.iconPath ?? ''}`}
                      alt={`${embed.appLabel} icon`}
                      className="size-6"
                    />
                    {embed.title}
                  </div>
                </TypographyH3>
              </CardHeader>
              <CardContent className="p-0">
                <div className="h-80 w-full">
                  <AppUI
                    getAccessTokens={getAccessTokens}
                    appIdentifier={embed.appIdentifier}
                    uiIdentifier={embed.uiIdentifier}
                    url={url}
                    host={API_HOST}
                    scheme={protocol}
                    queryParams={{
                      basePath: `${protocol}//${API_HOST}`,
                      folderId,
                      objectKey,
                    }}
                  />
                </div>
              </CardContent>
            </Card>
          )
        })}
        {folderObject.hash && (
          <Card className="shrink-0">
            <CardHeader className="p-4 pt-3">
              <TypographyH3>
                <div className="flex items-center gap-2">
                  <ScrollText className="size-6" />
                  Metadata
                </div>
              </TypographyH3>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-4">
                <ul>
                  {Object.keys(
                    folderObject.contentMetadata[folderObject.hash] ?? {},
                  ).map((metadataKey, i) => {
                    const metadataEntry =
                      folderObject.contentMetadata[folderObject.hash ?? '']?.[
                        metadataKey
                      ]

                    return (
                      <li key={i} className="flex flex-col">
                        <div className="flex justify-between gap-x-6 py-3">
                          <div className="flex min-w-0 items-center justify-center gap-x-4">
                            <div className="rounded-full p-2 pl-0">
                              {metadataEntry?.mimeType ===
                              'application/json' ? (
                                <FileJson className="size-5" />
                              ) : mediaTypeFromMimeType(
                                  metadataEntry?.mimeType ?? '',
                                ) === MediaType.Image ? (
                                <Image className="size-5" />
                              ) : mediaTypeFromMimeType(
                                  metadataEntry?.mimeType ?? '',
                                ) === MediaType.Audio ? (
                                <MusicIcon className="size-5" />
                              ) : mediaTypeFromMimeType(
                                  metadataEntry?.mimeType ?? '',
                                ) === MediaType.Video ? (
                                <VideoIcon className="size-5" />
                              ) : mediaTypeFromMimeType(
                                  metadataEntry?.mimeType ?? '',
                                ) === MediaType.Document ? (
                                <FileTextIcon className="size-5" />
                              ) : (
                                <File className="size-5" />
                              )}
                            </div>
                            <div className="min-w-0 flex-auto">
                              <p
                                className={cn('text-sm font-medium leading-6')}
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
                                {metadataEntry?.type === 'external' ? (
                                  <span>
                                    {metadataEntry.mimeType} -{' '}
                                    {formatBytes(metadataEntry.size)} -{' '}
                                    <span className="opacity-60">{`#${metadataEntry.hash.slice(0, 8)}`}</span>
                                  </span>
                                ) : (
                                  <span>
                                    <span className="opacity-50">value: </span>
                                    {metadataEntry?.content ?? ''}
                                  </span>
                                )}
                              </p>
                            </div>
                          </div>
                          {metadataEntry?.type === 'external' && (
                            <div className="flex shrink-0 gap-2 sm:flex sm:items-end">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
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
                                }}
                              >
                                <Download className="size-5" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </li>
                    )
                  })}
                </ul>
                <div className="overflow-x-hidden">
                  <pre className="overflow-x-auto rounded-md bg-foreground/[.025] p-4 text-sm text-foreground/[.75]">
                    {JSON.stringify(
                      {
                        contentMetadata: folderObject.contentMetadata,
                      },
                      null,
                      2,
                    )}
                  </pre>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {tasks && tasks.length > 0 && (
          <Card className="shrink-0">
            <CardHeader className="p-4 pt-3">
              <TypographyH3>
                <div className="flex items-center gap-2">
                  <ListChecks className="size-6" />
                  Tasks
                </div>
              </TypographyH3>
            </CardHeader>
            <CardContent>
              <TasksList tasks={tasks} />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
