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

import { FolderEventsList } from '../folder-events-list/folder-events-list.view'
import { FolderTasksList } from '../folder-tasks-list/folder-tasks-list.view'

export const FolderSidebar = ({
  folderAndPermission,
  folderMetadata,
}: {
  folderAndPermission?: FolderGetResponse
  folderMetadata?: FolderMetadata
}) => {
  const { folder } = folderAndPermission ?? {}

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="vertical-scrollbar-container flex flex-1 flex-col gap-4 overflow-y-auto">
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
                    folderMetadata?.totalSizeBytes.toLocaleString() ?? 'unknown'
                  } bytes)`}</span>
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <div className="shrink-0 overflow-hidden">
          <FolderTasksList {...{ folderAndPermission }} />
        </div>

        <div className="shrink-0 overflow-hidden">
          <FolderEventsList {...{ folderAndPermission }} />
        </div>
      </div>
    </div>
  )
}
