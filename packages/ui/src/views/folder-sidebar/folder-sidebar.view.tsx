import type { FolderGetResponse, FolderMetadata } from '@lombokapp/types'
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  cn,
  Label,
  ScrollArea,
  TypographyH3,
} from '@lombokapp/ui-toolkit'
import { formatBytes } from '@lombokapp/utils'
import { Calculator, Globe, KeyRound, Search } from 'lucide-react'

import { useServerContext } from '@/src/contexts/server'
import { $apiClient } from '@/src/services/api'
import { AppUI } from '@/src/views/app-ui/app-ui.view'

import { FolderEventsList } from '../folder-events-list/folder-events-list.view'
import { FolderTasksList } from '../folder-tasks-list/folder-tasks-list.view'

export function FolderSidebar({
  folderAndPermission,
  folderMetadata,
  onFolderAccessErrorCheck,
}: {
  folderAndPermission?: FolderGetResponse
  folderMetadata?: FolderMetadata
  onFolderAccessErrorCheck: () => Promise<void>
}) {
  const { folder } = folderAndPermission ?? {}
  const serverContext = useServerContext()

  // Move constants inside component to avoid HMR issues
  const protocol = window.location.protocol
  const hostname = window.location.hostname
  const port = window.location.port
  const API_HOST = `${hostname}${port ? `:${port}` : ''}`
  const rerunAccessCheck = async () => {
    if (!folder) {
      return
    }
    await onFolderAccessErrorCheck()
  }

  return (
    <div className="h-full">
      <div className="h-full py-6">
        <ScrollArea className="h-full">
          <div className="flex">
            <div className="w-0 grow truncate">
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
                              {folder.contentLocation.providerType ===
                              'USER' ? (
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
                          {folder.accessError && (
                            <div className="mt-4 rounded-md border border-red-300 bg-red-50 p-3 text-red-700">
                              <div className="text-sm font-semibold">
                                Storage access problem
                              </div>
                              <div className="text-xs">
                                <span className="font-mono">
                                  {folder.accessError.code}
                                </span>
                                : {folder.accessError.message}
                              </div>
                              <div className="mt-2">
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => void rerunAccessCheck()}
                                >
                                  Re-run access check
                                </Button>
                              </div>
                            </div>
                          )}
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
                  serverContext.appContributions.folderSidebarViewContributions.all.map(
                    (view) => {
                      const getAccessTokens = () =>
                        $apiClient
                          .POST(
                            '/api/v1/server/apps/{appIdentifier}/user-access-token',
                            {
                              params: {
                                path: { appIdentifier: view.appIdentifier },
                              },
                            },
                          )
                          .then((res) => {
                            if (!res.data) {
                              throw new Error(
                                'Failed to generate app access token',
                              )
                            }
                            return res.data.session
                          })
                      return (
                        <Card
                          className="shrink-0"
                          key={`${view.appIdentifier}:${view.path}`}
                        >
                          <CardHeader className="p-4 pt-3">
                            <TypographyH3>
                              <div className="flex items-center gap-2">
                                <img
                                  src={`${protocol}//${view.appIdentifier}.apps.${API_HOST}${view.iconPath ?? ''}`}
                                  alt={`${view.appLabel} icon`}
                                  className="size-6"
                                />
                                {view.label}
                              </div>
                            </TypographyH3>
                          </CardHeader>
                          <CardContent className="p-0">
                            <div className="h-80 w-full">
                              <AppUI
                                getAccessTokens={getAccessTokens}
                                appIdentifier={view.appIdentifier}
                                pathAndQuery={`${view.path}?folderId=${folder.id}`}
                                host={API_HOST}
                                scheme={protocol}
                              />
                            </div>
                          </CardContent>
                        </Card>
                      )
                    },
                  )}

                <div className="shrink-0 overflow-hidden">
                  <FolderTasksList {...{ folderAndPermission }} />
                </div>

                <div className="shrink-0 overflow-hidden">
                  <FolderEventsList {...{ folderAndPermission }} />
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>
      </div>
    </div>
  )
}
