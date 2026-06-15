import { Button } from '@lombokapp/ui-toolkit/components/button'
import { cn } from '@lombokapp/ui-toolkit/utils/tailwind'
import { useQueryClient } from '@tanstack/react-query'
import { Star } from 'lucide-react'
import React from 'react'

import { $api } from '@/src/services/api'

export function FolderStarToggle({
  folderId,
  starred,
  className,
}: {
  folderId: string
  starred: boolean
  className?: string
}) {
  const queryClient = useQueryClient()

  const setStarredMutation = $api.useMutation(
    'put',
    '/api/v1/folders/{folderId}/starred',
    {
      onSuccess: async () => {
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: ['get', '/api/v1/folders'],
          }),
          queryClient.invalidateQueries({
            queryKey: ['get', '/api/v1/folders/starred'],
          }),
          queryClient.invalidateQueries({
            queryKey: [
              'get',
              '/api/v1/folders/{folderId}',
              { params: { path: { folderId } } },
            ],
          }),
        ])
      },
    },
  )

  const toggle = React.useCallback(
    (e: React.MouseEvent) => {
      // Folder rows are wrapped in a link overlay — don't navigate on toggle.
      e.preventDefault()
      e.stopPropagation()
      setStarredMutation.mutate({
        params: { path: { folderId } },
        body: { starred: !starred },
      })
    },
    [setStarredMutation, folderId, starred],
  )

  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn('size-8', className)}
      aria-label={starred ? 'Unstar folder' : 'Star folder'}
      aria-pressed={starred}
      loading={setStarredMutation.isPending}
      onClick={toggle}
    >
      <Star
        className={cn(
          'size-4',
          starred ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground',
        )}
      />
    </Button>
  )
}
