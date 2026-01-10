import type { ContentMetadataEntry, PreviewMetadata } from '@lombokapp/types'
import {
  FolderPermissionEnum,
  FolderPushMessage,
  MediaType,
} from '@lombokapp/types'
import { buttonVariants } from '@lombokapp/ui-toolkit/components/button'
import { Button } from '@lombokapp/ui-toolkit/components/button/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@lombokapp/ui-toolkit/components/select'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@lombokapp/ui-toolkit/components/tooltip'
import { TypographyH3 } from '@lombokapp/ui-toolkit/components/typography-h3/typography-h3'
import { useToast } from '@lombokapp/ui-toolkit/hooks'
import { cn } from '@lombokapp/ui-toolkit/utils/tailwind'
import { Download, File, Image, Trash } from 'lucide-react'
import React from 'react'
import { useLocation, useNavigate } from 'react-router'

import { FolderObjectDetailViewEmbedSelector } from '@/src/components/folder-object-detail-view-selector/folder-object-detail-view-embed-selector'
import { useFolderContext } from '@/src/contexts/folder'
import { useLocalFileCacheContext } from '@/src/contexts/local-file-cache'
import type { AppPathContribution } from '@/src/contexts/server'
import { useServerContext } from '@/src/contexts/server'
import { $apiClient } from '@/src/services/api'
import { iconForMediaType } from '@/src/utils/icons'

import type { DeleteObjectModalData } from '../../components/delete-object-modal/delete-object-modal'
import { DeleteObjectModal } from '../../components/delete-object-modal/delete-object-modal'
import { useFocusedFolderObjectContext } from '../../pages/folders/focused-folder-object.context'
import { AppUI } from '../app-ui/app-ui.view'
import { FolderObjectPreview } from '../folder-object-preview/folder-object-preview.view'
import { FolderObjectSidebar } from '../folder-object-sidebar/folder-object-sidebar.view'

const protocol = window.location.protocol
const hostname = window.location.hostname
const port = window.location.port
const API_HOST = `${hostname}${port ? `:${port}` : ''}`

export const FolderObjectDetailScreen = ({
  folderId,
  objectKey,
}: {
  folderId: string
  objectKey: string
}) => {
  const [sidebarOpen, _setSidebarOpen] = React.useState(true)
  const serverContext = useServerContext()
  const { focusedFolderObject: folderObject, refetch: refetchFolderObject } =
    useFocusedFolderObjectContext()

  const { downloadToFile } = useLocalFileCacheContext()
  const [deleteModalData, setDeleteModalData] =
    React.useState<DeleteObjectModalData>({
      isOpen: false,
    })

  const { toast } = useToast()
  const handleDownload = React.useCallback(() => {
    toast({ title: 'Preparing download' })
    downloadToFile(
      folderId,
      `content:${objectKey}`,
      objectKey.split('/').at(-1) ?? objectKey,
    )
  }, [downloadToFile, folderId, objectKey, toast])

  const currentVersionMetadata = React.useMemo(
    () =>
      (folderObject?.hash && folderObject.contentMetadata[folderObject.hash]
        ? (folderObject.contentMetadata[folderObject.hash] ?? {})
        : {}) as Record<string, ContentMetadataEntry | undefined>,
    [folderObject?.contentMetadata, folderObject?.hash],
  )
  const IconComponent = iconForMediaType(
    (folderObject?.mediaType as MediaType | undefined) ?? MediaType.Unknown,
  )

  const previews = React.useMemo(
    () =>
      'previews' in currentVersionMetadata &&
      currentVersionMetadata['previews']?.type === 'inline'
        ? (JSON.parse(currentVersionMetadata['previews'].content) as Record<
            string,
            PreviewMetadata
          >)
        : {},
    [currentVersionMetadata],
  )

  const displayModeOptions = React.useMemo<
    Record<
      string,
      { key: string; label: string; purpose?: string; icon: () => JSX.Element }
    >
  >(
    () => ({
      original: {
        key: 'original',
        label: 'Original',
        icon: () => <IconComponent />,
      },
      ...Object.keys(previews).reduce((acc, previewKey) => {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const preview = previews[previewKey]!

        return {
          ...acc,
          [`${preview.hash}_${preview.profile}`]: {
            key: previewKey,
            label: preview.label,
            purpose: preview.purpose,
            icon: () => <Image />,
          },
        }
      }, {}),
    }),
    [IconComponent, previews],
  )

  const [selectedDisplayMode, setSelectedDisplayMode] = React.useState<
    | {
        type: 'original'
      }
    | {
        type: 'metadata_preview'
        metadataKey: string
      }
  >()

  const [selectedContributedView, setSelectedContrbutedView] =
    React.useState<AppPathContribution>()

  React.useEffect(() => {
    if (!folderObject) {
      return
    }
    if (!selectedDisplayMode) {
      const previewOption = Object.keys(displayModeOptions).find(
        (key) => displayModeOptions[key]?.purpose === 'detail',
      )
      if (previewOption) {
        setSelectedDisplayMode({
          type: 'metadata_preview',
          metadataKey: displayModeOptions[previewOption]?.key ?? '',
        })
      } else {
        setSelectedDisplayMode({ type: 'original' })
      }
    }
  }, [selectedDisplayMode, displayModeOptions, folderObject])

  const messageHandler = React.useCallback(
    (name: FolderPushMessage, payload: unknown) => {
      if (
        [
          FolderPushMessage.OBJECT_UPDATED,
          FolderPushMessage.OBJECTS_REMOVED,
        ].includes(name) &&
        // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
        (payload as any).objectKey === objectKey
      ) {
        void refetchFolderObject()
      }
    },
    [refetchFolderObject, objectKey],
  )
  const folderContext = useFolderContext(messageHandler)
  const navigate = useNavigate()
  const location = useLocation()

  const handleFolderLinkClick = React.useCallback(() => {
    const folderPath = `/folders/${folderId}`

    // Check if we just came from the parent folder view
    if (location.pathname.startsWith(folderPath) && location.key) {
      // If we have a browser history key, we can go back
      void navigate(-1)
    } else {
      // Otherwise navigate directly to the folder view
      void navigate(folderPath)
    }
  }, [navigate, location, folderId])

  const handleDelete = async () => {
    if (!folderObject) {
      return
    }

    if (
      folderContext.folderPermissions?.includes(
        FolderPermissionEnum.OBJECT_EDIT,
      )
    ) {
      await folderContext.deleteFolderObject(folderObject.objectKey)
      handleFolderLinkClick()
    }
  }

  const getAccessTokens = (appIdentifier: string) =>
    $apiClient
      .POST('/api/v1/user/apps/{appIdentifier}/access-token', {
        params: { path: { appIdentifier } },
      })
      .then((res) => {
        if (!res.data) {
          throw new Error('Failed to generate app access token')
        }
        return res.data.session
      })

  return (
    <>
      <DeleteObjectModal
        modalData={{
          ...deleteModalData,
          folderObject,
        }}
        setModalData={setDeleteModalData}
        onConfirm={handleDelete}
      />
      <div className="flex size-full flex-1 justify-between overflow-x-visible">
        <div className="flex max-w-full flex-col py-6 lg:w-1/2 xl:flex-1">
          <div className="flex items-start justify-between pb-2 pr-0 lg:pr-4">
            <div className="pl-2">
              <TypographyH3>{objectKey}</TypographyH3>
            </div>
            {folderObject?.objectKey && (
              <div className="pl-2">
                <div className="flex gap-2">
                  {serverContext.appContributions.objectDetailViewContributions
                    .all.length > 0 ? (
                    <FolderObjectDetailViewEmbedSelector
                      options={
                        serverContext.appContributions
                          .objectDetailViewContributions.all
                      }
                      value={
                        selectedContributedView
                          ? selectedContributedView.appIdentifier
                          : 'default'
                      }
                      onSelect={(appIdentifier) =>
                        setSelectedContrbutedView(
                          serverContext.appContributions.objectDetailViewContributions.all.find(
                            (o) => o.appIdentifier === appIdentifier,
                          ),
                        )
                      }
                    />
                  ) : null}
                  {folderContext.folderPermissions?.includes(
                    FolderPermissionEnum.OBJECT_EDIT,
                  ) && (
                    <TooltipProvider>
                      <Tooltip delayDuration={100}>
                        <TooltipTrigger asChild>
                          <Button
                            size="sm"
                            onClick={() => setDeleteModalData({ isOpen: true })}
                            variant={'outline'}
                          >
                            <Trash className="size-5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom">Delete</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                  <TooltipProvider>
                    <Tooltip delayDuration={100}>
                      <TooltipTrigger asChild>
                        <Button
                          size="sm"
                          variant={'outline'}
                          onClick={handleDownload}
                        >
                          <Download className="size-5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom">Download</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>
            )}
          </div>
          <div
            className={cn(
              'flex w-full flex-1 overflow-hidden',
              sidebarOpen && 'pr-0 lg:pr-4',
            )}
          >
            {folderObject && (
              <div
                className={'flex max-w-full flex-1 flex-col justify-around'}
                key={
                  selectedContributedView
                    ? `contributed_view-${selectedContributedView.appIdentifier}-${selectedContributedView.path}`
                    : `display_mode-${selectedDisplayMode?.type === 'original' ? 'original' : selectedDisplayMode?.metadataKey}`
                }
              >
                {selectedContributedView ? (
                  <AppUI
                    getAccessTokens={getAccessTokens}
                    appIdentifier={selectedContributedView.appIdentifier}
                    pathAndQuery={`${selectedContributedView.path}?folderId=${folderId}&objectKey=${objectKey}`}
                    host={API_HOST}
                    scheme={protocol}
                  />
                ) : (
                  <div className="relative flex size-full flex-col items-center justify-center">
                    <div
                      className={cn(
                        'overflow-hidden shrink-0 duration-200 ease-in-out absolute top-4 right-4 z-10',
                      )}
                    >
                      {' '}
                      {selectedDisplayMode && (
                        <Select
                          disabled={!!selectedContributedView}
                          value={
                            selectedDisplayMode.type === 'original'
                              ? 'original'
                              : selectedDisplayMode.metadataKey
                          }
                          onValueChange={(value) => {
                            setSelectedDisplayMode({
                              type:
                                displayModeOptions[value]?.key === 'original'
                                  ? 'original'
                                  : 'metadata_preview',
                              metadataKey: value,
                            })
                          }}
                        >
                          <TooltipProvider>
                            <Tooltip delayDuration={100}>
                              <TooltipTrigger asChild>
                                <SelectTrigger
                                  className={cn(
                                    buttonVariants({
                                      size: 'sm',
                                      variant: 'outline',
                                    }),
                                    'gap-2 justify-between',
                                  )}
                                >
                                  <SelectValue />
                                </SelectTrigger>
                              </TooltipTrigger>
                              <TooltipContent side="bottom" align="end">
                                Select display mode
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>

                          <SelectContent align="end">
                            {Object.keys(displayModeOptions).map(
                              (displayModeKey) => {
                                const OptionIcon =
                                  displayModeOptions[displayModeKey]?.icon ??
                                  File
                                return (
                                  <SelectItem
                                    key={displayModeKey}
                                    value={
                                      displayModeOptions[displayModeKey]?.key ??
                                      ''
                                    }
                                  >
                                    <div className="flex items-center gap-2">
                                      <OptionIcon className="size-5 shrink-0" />
                                      <span>
                                        {
                                          displayModeOptions[displayModeKey]
                                            ?.label
                                        }
                                      </span>
                                    </div>
                                  </SelectItem>
                                )
                              },
                            )}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                    <FolderObjectPreview
                      folderId={folderId}
                      showExplanation={true}
                      objectKey={objectKey}
                      folderObject={folderObject}
                      maxRenderSizeBytes={10 * 1024 * 1024}
                      displayConfig={
                        selectedDisplayMode?.type === 'original'
                          ? { type: 'original' }
                          : {
                              type: 'preview_variant',
                              variantKey:
                                selectedDisplayMode?.metadataKey ?? '',
                            }
                      }
                      displayMode="object-scale-down"
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        {sidebarOpen && folderObject && folderContext.folder && (
          <div className="flex max-w-0 overflow-x-visible lg:w-1/2 lg:max-w-[40rem] 2xl:w-2/5">
            <div className="size-full overflow-x-visible">
              <FolderObjectSidebar
                folderAndPermission={
                  folderContext.folderPermissions && {
                    folder: folderContext.folder,
                    permissions: folderContext.folderPermissions,
                  }
                }
                folder={folderContext.folder}
                objectKey={objectKey}
                folderObject={folderObject}
              />
            </div>
          </div>
        )}
      </div>
    </>
  )
}
