import type { FolderGetResponse, FolderMetadata } from '@stellariscloud/types'
import {
  Card,
  CardContent,
  CardHeader,
  cn,
  Label,
  TypographyH3,
} from '@stellariscloud/ui-toolkit'
import { formatBytes } from '@stellariscloud/utils'
import { Calculator, Globe, KeyRound, Search } from 'lucide-react'

import { useServerContext } from '@/src/hooks/use-server-context'
import { $apiClient } from '@/src/services/api'
import { AppUI } from '@/src/views/app-ui/app-ui.view'

import { FolderEventsList } from '../folder-events-list/folder-events-list.view'
import { FolderTasksList } from '../folder-tasks-list/folder-tasks-list.view'

const protocol = window.location.protocol
const hostname = window.location.hostname
const port = window.location.port
const API_HOST = `${hostname}${port ? `:${port}` : ''}`

export const FolderSidebar = ({
  folderAndPermission,
  folderMetadata,
}: {
  folderAndPermission?: FolderGetResponse
  folderMetadata?: FolderMetadata
}) => {
  const { folder } = folderAndPermission ?? {}
  const serverContext = useServerContext()

  return (
    <div className="h-full overflow-x-visible">
      <div className="h-full w-[calc(100%+1rem)] overflow-y-scroll py-6 pr-4">
        <div className="flex flex-1 flex-col gap-4">
          <Card className="shrink-0">
            <CardHeader className="p-4 pt-3">
              <TypographyH3>
                <div className="flex items-center gap-2">
                  <Search className="size-6" />
                  <TypographyH3>Folder overview</TypographyH3>
                </div>
              </TypographyH3>
            </CardHeader>
            <CardContent className="p-4">
              <dl>
                {folder && (
                  <>
                    <div className="mt-0 flex w-full flex-none items-center gap-x-4">
                      <dt className="flex flex-none">
                        <span className="sr-only">Access Key</span>
                        <KeyRound className="size-5" />
                      </dt>
                      <dd className={cn('text-sm leading-6')}>
                        {folder.contentLocation.providerType === 'USER' ? (
                          <a
                            className="underline"
                            href={`/access-keys/${folder.contentLocation.accessKeyHashId}`}
                          >
                            <Label>{folder.contentLocation.label}</Label>
                          </a>
                        ) : (
                          <Label>{folder.contentLocation.label}</Label>
                        )}
                      </dd>
                    </div>
                    <div className="mt-4 flex w-full flex-none items-center gap-x-4">
                      <dt className="flex flex-none">
                        <span className="sr-only">Bucket</span>
                        <Globe className="size-5" />
                      </dt>
                      <dd className={cn('text-sm leading-6')}>
                        <span className="opacity-50">Bucket: </span>
                        <span className="italic">
                          {folder.contentLocation.bucket}
                        </span>{' '}
                        - <span className="opacity-50">Prefix: </span>
                        <span className="italic">
                          {folder.contentLocation.prefix}
                        </span>
                      </dd>
                    </div>
                  </>
                )}
                <div className="mt-4 flex w-full flex-none items-center gap-x-4">
                  <dt className="flex flex-none">
                    <span className="sr-only">Size</span>
                    <Calculator className="size-5" />
                  </dt>
                  <dd className={cn('text-sm leading-6')}>
                    {`${folderMetadata ? folderMetadata.totalCount : 'unknown'}`}{' '}
                    objects -{' '}
                    {`${
                      folderMetadata
                        ? formatBytes(folderMetadata.totalSizeBytes)
                        : 'unknown'
                    }`}{' '}
                    <span className="font-mono">{`(${
                      folderMetadata?.totalSizeBytes.toLocaleString() ??
                      'unknown'
                    } bytes)`}</span>
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          {folder &&
            serverContext.folderSidebarEmbedContributions.map((embed) => {
              const url = embed.path.replace('{folderId}', folder.id)
              const getAccessTokens = () =>
                $apiClient
                  .POST(
                    '/api/v1/server/apps/{appIdentifier}/user-access-token',
                    {
                      params: { path: { appIdentifier: embed.appIdentifier } },
                    },
                  )
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
                          folderId: folder.id,
                        }}
                      />
                    </div>
                  </CardContent>
                </Card>
              )
            })}

          <div className="shrink-0 overflow-hidden">
            <FolderTasksList {...{ folderAndPermission }} />
          </div>

          <div className="shrink-0 overflow-hidden">
            <FolderEventsList {...{ folderAndPermission }} />
          </div>
        </div>
      </div>
    </div>
  )
}
