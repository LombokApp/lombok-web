import { MediaType } from '@lombokapp/types'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@lombokapp/ui-toolkit/components/command'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@lombokapp/ui-toolkit/components/dialog'
import { cn } from '@lombokapp/ui-toolkit/utils/tailwind'
import { encodeS3ObjectKey, formatBytes } from '@lombokapp/utils'
import {
  FileIcon,
  FileQuestion,
  FileText,
  Image as ImageIcon,
  Music,
  Video,
} from 'lucide-react'
import React from 'react'
import { useNavigate } from 'react-router'

import { $api } from '@/src/services/api'

const getMediaTypeIcon = (mediaType: MediaType) => {
  switch (mediaType) {
    case MediaType.IMAGE:
      return <ImageIcon className="size-4" />
    case MediaType.VIDEO:
      return <Video className="size-4" />
    case MediaType.AUDIO:
      return <Music className="size-4" />
    case MediaType.DOCUMENT:
      return <FileText className="size-4" />
    case MediaType.UNKNOWN: {
      return <FileIcon className="size-4" />
    }
    default:
      return <FileQuestion className="size-4" />
  }
}

export function SearchCommandPalette() {
  const [open, setOpen] = React.useState(false)
  const [queryInputValue, setQueryInputValue] = React.useState('')
  const [searchQuery, setSearchQuery] = React.useState<string | null>(null)
  const navigate = useNavigate()

  const searchQueryResult = $api.useQuery(
    'get',
    '/api/v1/search',
    {
      params: {
        query: {
          q: searchQuery ?? '',
        },
      },
    },
    {
      enabled: searchQuery !== null && searchQuery.trim() !== '',
      retry: false,
    },
  )

  // Handle ⌘K / Ctrl+K keyboard shortcut
  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((currentOpenState) => !currentOpenState)
      }
    }

    document.addEventListener('keydown', down)
    return () => {
      document.removeEventListener('keydown', down)
    }
  }, [])

  // Handle Escape key to close and reset
  const handleOpenChange = React.useCallback((newOpen: boolean) => {
    setOpen(newOpen)
    if (!newOpen) {
      setQueryInputValue('')
      setSearchQuery(null)
    }
  }, [])

  // Handle Enter key to execute search
  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && queryInputValue.trim() !== '') {
        e.preventDefault()
        e.stopPropagation()
        setSearchQuery(queryInputValue.trim())
      } else if (e.key === 'Escape') {
        setQueryInputValue('')
        setSearchQuery(null)
        setOpen(false)
      }
    },
    [queryInputValue],
  )

  const searchResults = React.useMemo(() => {
    if (!searchQuery || !searchQueryResult.data) {
      return []
    }
    return searchQueryResult.data.result
  }, [searchQuery, searchQueryResult.data])

  const handleResultSelect = React.useCallback(
    (folderId: string, objectKey: string) => {
      void navigate(
        `/folders/${folderId}/objects/${encodeS3ObjectKey(objectKey)}`,
      )
      handleOpenChange(false)
    },
    [handleOpenChange, navigate],
  )

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTitle className="size-0 opacity-0">Search</DialogTitle>
      <DialogDescription className="size-0 opacity-0">
        Search for files in your folders
      </DialogDescription>
      <DialogContent className="overflow-hidden p-0">
        <Command
          shouldFilter={false}
          className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group]:not([hidden])_~[cmdk-group]]:pt-0 [&_[cmdk-group]]:px-2 [&_[cmdk-input-wrapper]_svg]:size-5 [&_[cmdk-input]]:h-12 [&_[cmdk-item]]:px-2 [&_[cmdk-item]]:py-3 [&_[cmdk-item]_svg]:size-5"
        >
          <div
            className={cn(
              'relative',
              queryInputValue && '[&_[cmdk-input-wrapper]]:pr-8',
            )}
          >
            <CommandInput
              placeholder="Search files..."
              value={queryInputValue}
              onValueChange={setQueryInputValue}
              onKeyDown={handleKeyDown}
            />
          </div>
          <CommandList>
            <CommandEmpty>
              {queryInputValue.trim() === ''
                ? 'Type to search...'
                : searchQueryResult.isLoading
                  ? 'Searching...'
                  : 'No results found.'}
            </CommandEmpty>
            {searchResults.length > 0 && (
              <CommandGroup heading="Results">
                {searchResults.map((result) => {
                  const { folderObject } = result
                  const fileName =
                    folderObject.objectKey.split('/').at(-1) ??
                    folderObject.objectKey
                  const folderLabel = result.folderName

                  return (
                    <CommandItem
                      key={`${folderObject.folderId}:${folderObject.objectKey}`}
                      value={`${fileName} ${folderObject.objectKey} ${folderLabel}`}
                      onSelect={() =>
                        handleResultSelect(
                          folderObject.folderId,
                          folderObject.objectKey,
                        )
                      }
                    >
                      <div className="flex w-full items-center gap-3">
                        <div className="flex size-9 items-center justify-center rounded-md bg-muted/60 text-muted-foreground">
                          {getMediaTypeIcon(MediaType[folderObject.mediaType])}
                        </div>
                        <div className="flex min-w-0 flex-1 flex-col">
                          <div className="truncate font-medium text-foreground">
                            {fileName}
                          </div>
                          <div className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
                            <span className="truncate">{folderLabel}</span>
                            <span aria-hidden="true">|</span>
                            <span className="truncate font-mono">
                              {folderObject.objectKey}
                            </span>
                          </div>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-1 text-xs text-muted-foreground">
                          <span>{formatBytes(folderObject.sizeBytes)}</span>
                          <span className="font-mono">
                            {folderObject.mediaType}
                          </span>
                        </div>
                      </div>
                    </CommandItem>
                  )
                })}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  )
}
