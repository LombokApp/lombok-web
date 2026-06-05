import type { ImageUploaderError } from '@lombokapp/ui-toolkit/components/image-uploader'
import { ImageUploader as ToolkitImageUploader } from '@lombokapp/ui-toolkit/components/image-uploader'
import { useToast } from '@lombokapp/ui-toolkit/hooks'
import { FolderIcon } from 'lucide-react'
import React from 'react'

import type {
  EntityAvatarKind,
  ImageUrls,
} from '../entity-avatar/entity-avatar'

interface ImageUploaderProps {
  kind: EntityAvatarKind
  name?: string | null
  image?: ImageUrls
  disabled?: boolean
  onUpload: (file: File) => Promise<void>
  onDelete: () => Promise<void>
}

function getUserInitial(name?: string | null): string {
  const first = name?.trim().charAt(0)
  return first && first.length > 0 ? first.toUpperCase() : '?'
}

const ERROR_TITLES: Record<ImageUploaderError['kind'], string> = {
  'invalid-type': 'Unsupported file type',
  'too-large': 'Image too large',
  'too-small': 'Image too small',
  unreadable: 'Could not read image',
  'process-failed': 'Could not process image',
  'upload-failed': 'Upload failed',
  'delete-failed': 'Could not remove image',
}

/**
 * Platform adapter over the shared toolkit uploader: maps our entity `kind` +
 * `ImageUrls` onto the generic shape/imageUrl/fallback API and renders the
 * uploader's structured errors as toasts (including the 501 storage-not-
 * configured case). Callers' network logic is unchanged.
 */
export function ImageUploader({
  kind,
  name,
  image,
  disabled,
  onUpload,
  onDelete,
}: ImageUploaderProps) {
  const { toast } = useToast()
  const isUser = kind === 'user'

  const handleError = React.useCallback(
    (error: ImageUploaderError) => {
      if (
        error.kind === 'upload-failed' &&
        (error.cause as { status?: number } | undefined)?.status === 501
      ) {
        toast({
          title: 'Custom images aren’t available',
          description:
            "Your administrator hasn't configured server storage yet.",
          variant: 'destructive',
        })
        return
      }
      toast({
        title: ERROR_TITLES[error.kind],
        description: error.message,
        variant: 'destructive',
      })
    },
    [toast],
  )

  return (
    <ToolkitImageUploader
      shape={isUser ? 'circle' : 'square'}
      imageUrl={image?.large}
      fallback={
        isUser ? (
          <span className="text-sm font-medium uppercase">
            {getUserInitial(name)}
          </span>
        ) : (
          <FolderIcon className="size-1/2" aria-hidden />
        )
      }
      helperText={`PNG, JPEG, or WebP. At least 250×250px.`}
      disabled={disabled}
      onUpload={onUpload}
      onDelete={onDelete}
      onError={handleError}
    />
  )
}
