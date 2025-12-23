import type {
  ContentMetadataType,
  FolderDTO,
  FolderGetResponse,
  FolderObjectDTO,
} from '@lombokapp/types'
import { MediaType } from '@lombokapp/types'
import { Button } from '@lombokapp/ui-toolkit/components/button/button'
import { CardContent, CardHeader } from '@lombokapp/ui-toolkit/components/card'
import { Card } from '@lombokapp/ui-toolkit/components/card/card'
import { ScrollArea } from '@lombokapp/ui-toolkit/components/scroll-area/scroll-area'
import { TypographyH3 } from '@lombokapp/ui-toolkit/components/typography-h3/typography-h3'
import { cn } from '@lombokapp/ui-toolkit/utils/tailwind'
import {
  extensionFromMimeType,
  formatBytes,
  mediaTypeFromMimeType,
  toMetadataObjectIdentifier,
} from '@lombokapp/utils'
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
  MusicIcon,
  ScrollText,
  Search,
  TvIcon,
  VideoIcon,
} from 'lucide-react'

import { useLocalFileCacheContext } from '@/src/contexts/local-file-cache'
import { useServerContext } from '@/src/contexts/server'
import { $apiClient } from '@/src/services/api'
import { AppUI } from '@/src/views/app-ui/app-ui.view'
import { FolderObjectComments } from '@/src/views/folder-object-comments/folder-object-comments.view'
import { FolderTasksList } from '@/src/views/folder-tasks-list/folder-tasks-list.view'
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

  const metadata = folderObject.hash
    ? (folderObject.contentMetadata[folderObject.hash] ??
      ({} as ContentMetadataType))
    : ({} as ContentMetadataType)

  const previews =
    metadata.previews?.type === 'inline'
      ? JSON.stringify(JSON.parse(metadata.previews.content), null, 2)
      : undefined

  return (
    <div className="h-full pt-6">
      <ScrollArea className="size-full">
        <div className="w-0 grow truncate pb-4">
          <div className="flex flex-1 flex-col gap-4">
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
                        {folder.contentLocation.endpoint.endsWith('/')
                          ? ''
                          : '/'}
                        {folder.contentLocation.bucket}
                        {folder.contentLocation.bucket.endsWith('/') ? '' : '/'}
                        {folder.contentLocation.prefix}
                        {folder.contentLocation.prefix?.endsWith('/')
                          ? ''
                          : '/'}
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
                          {folderObject.mediaType === 'AUDIO' ? (
                            <MusicIcon className="size-5" />
                          ) : folderObject.mediaType === 'IMAGE' ? (
                            <ImageIcon className="size-5" />
                          ) : folderObject.mediaType === 'VIDEO' ? (
                            <VideoIcon className="size-5" />
                          ) : folderObject.mediaType === 'DOCUMENT' ? (
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
            {serverContext.appContributions.objectSidebarViewContributions.all.map(
              (embed) => {
                const getAccessTokens = () =>
                  $apiClient
                    .POST('/api/v1/user/apps/{appIdentifier}/access-token', {
                      params: {
                        path: { appIdentifier: embed.appIdentifier },
                      },
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
                    key={`${embed.appIdentifier}:${embed.path}`}
                  >
                    <CardHeader className="p-4 pt-3">
                      <TypographyH3>
                        <div className="flex items-center gap-2">
                          <img
                            src={`${protocol}//${embed.appIdentifier}.apps.${API_HOST}${embed.iconPath ?? ''}`}
                            alt={`${embed.appLabel} icon`}
                            className="size-6"
                          />
                          {embed.label}
                        </div>
                      </TypographyH3>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="h-80 w-full">
                        <AppUI
                          getAccessTokens={getAccessTokens}
                          appIdentifier={embed.appIdentifier}
                          pathAndQuery={`${embed.path}?folderId=${folderId}&objectKey=${objectKey}`}
                          host={API_HOST}
                          scheme={protocol}
                        />
                      </div>
                    </CardContent>
                  </Card>
                )
              },
            )}
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
                      )
                        .filter((metadataKey) => metadataKey !== 'previews')
                        .map((metadataKey, i) => {
                          const metadataEntry =
                            folderObject.contentMetadata[
                              folderObject.hash ?? ''
                            ]?.[metadataKey]

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
                                      ) === MediaType.IMAGE ? (
                                      <Image className="size-5" />
                                    ) : mediaTypeFromMimeType(
                                        metadataEntry?.mimeType ?? '',
                                      ) === MediaType.AUDIO ? (
                                      <MusicIcon className="size-5" />
                                    ) : mediaTypeFromMimeType(
                                        metadataEntry?.mimeType ?? '',
                                      ) === MediaType.VIDEO ? (
                                      <VideoIcon className="size-5" />
                                    ) : mediaTypeFromMimeType(
                                        metadataEntry?.mimeType ?? '',
                                      ) === MediaType.DOCUMENT ? (
                                      <FileTextIcon className="size-5" />
                                    ) : (
                                      <File className="size-5" />
                                    )}
                                  </div>
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
                                      {metadataEntry?.type === 'external' ? (
                                        <span>
                                          {metadataEntry.mimeType} -{' '}
                                          {formatBytes(metadataEntry.sizeBytes)}{' '}
                                          -{' '}
                                          <span className="opacity-60">{`#${metadataEntry.hash.slice(0, 8)}`}</span>
                                        </span>
                                      ) : (
                                        <span>
                                          <span className="opacity-50">
                                            value:{' '}
                                          </span>
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
                    {previews && (
                      <div>
                        <pre className="overflow-x-auto rounded-md bg-foreground/[.025] p-4 text-sm text-foreground/[.75]">
                          {previews}
                        </pre>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            <FolderObjectComments
              folderId={folderId}
              folderObjectId={folderObject.id}
            />

            <FolderTasksList
              folderId={folderId}
              objectKey={objectKey}
              limit={5}
              showHeader={true}
              showViewAllLink={false}
              hideWhenEmpty={true}
            />
          </div>
        </div>
      </ScrollArea>
    </div>
  )
}
