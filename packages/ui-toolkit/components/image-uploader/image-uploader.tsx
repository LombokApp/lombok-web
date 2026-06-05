import { Camera, Loader2 } from 'lucide-react'
import React from 'react'
import type { FileRejection } from 'react-dropzone'
import { useDropzone } from 'react-dropzone'

import { cn } from '../../utils/tailwind'
import { Avatar, AvatarFallback, AvatarImage } from '../avatar'
import { Button } from '../button'
import type { CompressOptions } from './crop-image'
import { ImageCropModal } from './image-crop-modal'

const DEFAULT_MAX_SOURCE_BYTES = 30 * 1024 * 1024
const DEFAULT_MIN_DIMENSION = 250
const ACCEPTED_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp'])

export type ImageUploaderShape = 'circle' | 'square'

export type ImageUploaderErrorKind =
  | 'invalid-type'
  | 'too-large'
  | 'too-small'
  | 'unreadable'
  | 'process-failed'
  | 'upload-failed'
  | 'delete-failed'

export interface ImageUploaderError {
  kind: ImageUploaderErrorKind
  message: string
  /** The original thrown value for upload/delete failures (e.g. a fetch error). */
  cause?: unknown
}

export interface ImageUploaderProps {
  /** Circular preview + crop (avatars) or square (icons). Default 'square'. */
  shape?: ImageUploaderShape
  /** Current image to preview (a URL or a data URL). */
  imageUrl?: string
  alt?: string
  /** Rendered inside the avatar when there is no image (icon, initials, …). */
  fallback?: React.ReactNode
  disabled?: boolean
  minDimension?: number
  maxSourceBytes?: number
  /** Forwarded to the crop/compress step (output size, byte budget, …). */
  compressOptions?: CompressOptions
  helperText?: React.ReactNode
  /** Sizing for the avatar preview. Default `size-20`. */
  previewClassName?: string
  modalTitle?: string
  onUpload: (file: File) => Promise<void>
  onDelete?: () => Promise<void>
  /** All validation/processing/upload problems surface here for the host to present. */
  onError?: (error: ImageUploaderError) => void
}

function readImageDimensions(
  file: File,
): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new globalThis.Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve({ width: img.naturalWidth, height: img.naturalHeight })
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Unable to read image'))
    }
    img.src = url
  })
}

export function ImageUploader({
  shape = 'square',
  imageUrl,
  alt = '',
  fallback,
  disabled,
  minDimension = DEFAULT_MIN_DIMENSION,
  maxSourceBytes = DEFAULT_MAX_SOURCE_BYTES,
  compressOptions,
  helperText,
  previewClassName = 'size-20',
  modalTitle,
  onUpload,
  onDelete,
  onError,
}: ImageUploaderProps) {
  const [pendingFile, setPendingFile] = React.useState<File | null>(null)
  const [modalOpen, setModalOpen] = React.useState(false)
  const [isBusy, setIsBusy] = React.useState(false)

  const isCircle = shape === 'circle'
  const shapeClass = isCircle ? 'rounded-full' : 'rounded-md'

  const handleSelectedSource = React.useCallback(
    async (file: File) => {
      if (!ACCEPTED_TYPES.has(file.type)) {
        onError?.({
          kind: 'invalid-type',
          message: 'Please pick a PNG, JPEG, or WebP image.',
        })
        return
      }
      if (file.size > maxSourceBytes) {
        onError?.({
          kind: 'too-large',
          message: `The image must be ${Math.round(
            maxSourceBytes / (1024 * 1024),
          )} MB or less.`,
        })
        return
      }
      try {
        const { width, height } = await readImageDimensions(file)
        if (width < minDimension || height < minDimension) {
          onError?.({
            kind: 'too-small',
            message: `The image must be at least ${minDimension}×${minDimension}px.`,
          })
          return
        }
      } catch {
        onError?.({
          kind: 'unreadable',
          message: 'Could not read that image. Try a different file.',
        })
        return
      }
      setPendingFile(file)
      setModalOpen(true)
    },
    [maxSourceBytes, minDimension, onError],
  )

  const onDrop = React.useCallback(
    (accepted: File[], rejections: FileRejection[]) => {
      const file = accepted[0]
      if (file) {
        void handleSelectedSource(file)
        return
      }
      if (rejections.length > 0) {
        onError?.({
          kind: 'invalid-type',
          message: 'Please pick a single PNG, JPEG, or WebP image.',
        })
      }
    },
    [handleSelectedSource, onError],
  )

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    accept: {
      'image/png': [],
      'image/jpeg': [],
      'image/webp': [],
    },
    multiple: false,
    maxFiles: 1,
    disabled: disabled || isBusy,
  })

  const handleConfirm = React.useCallback(
    async (croppedFile: File) => {
      setIsBusy(true)
      try {
        await onUpload(croppedFile)
        setModalOpen(false)
        setPendingFile(null)
      } catch (error) {
        onError?.({
          kind: 'upload-failed',
          message:
            error instanceof Error
              ? error.message
              : 'Upload failed. Try again or pick a different image.',
          cause: error,
        })
      } finally {
        setIsBusy(false)
      }
    },
    [onUpload, onError],
  )

  const handleCancel = React.useCallback(() => {
    setModalOpen(false)
    setPendingFile(null)
  }, [])

  const handleDelete = React.useCallback(async () => {
    if (!onDelete) {
      return
    }
    setIsBusy(true)
    try {
      await onDelete()
    } catch (error) {
      onError?.({
        kind: 'delete-failed',
        message:
          error instanceof Error ? error.message : 'Could not remove image.',
        cause: error,
      })
    } finally {
      setIsBusy(false)
    }
  }, [onDelete, onError])

  return (
    <div className="flex items-center gap-4">
      <div
        {...getRootProps()}
        className={cn(
          'group relative flex cursor-pointer items-center justify-center ring-offset-background transition focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          shapeClass,
          previewClassName,
          isDragActive && 'ring-2 ring-primary',
          (disabled || isBusy) && 'pointer-events-none opacity-60',
        )}
        aria-label="Upload image"
      >
        <input {...getInputProps()} />
        <Avatar className={cn(shapeClass, 'size-full bg-muted')}>
          {imageUrl ? <AvatarImage src={imageUrl} alt={alt} /> : null}
          <AvatarFallback
            className={cn(shapeClass, 'bg-muted text-muted-foreground')}
          >
            {fallback}
          </AvatarFallback>
        </Avatar>
        <div
          className={cn(
            'absolute inset-0 flex flex-col items-center justify-center gap-0.5 bg-black/55 text-white opacity-0 transition-opacity group-hover:opacity-100',
            shapeClass,
            isDragActive && 'opacity-100',
          )}
        >
          {isBusy ? (
            <Loader2 className="size-5 animate-spin" aria-hidden />
          ) : (
            <>
              <Camera className="size-5" aria-hidden />
              <span className="text-[10px] font-medium">Change</span>
            </>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled || isBusy}
            onClick={open}
          >
            {imageUrl ? 'Change' : 'Upload'}
          </Button>
          {imageUrl && onDelete ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={disabled || isBusy}
              onClick={() => void handleDelete()}
            >
              Remove
            </Button>
          ) : null}
        </div>
        <p className="text-xs text-muted-foreground">
          {helperText ?? (
            <>
              PNG, JPEG, or WebP. At least {minDimension}×{minDimension}px. Drop
              a file or click to choose.
            </>
          )}
        </p>
      </div>

      <ImageCropModal
        open={modalOpen}
        file={pendingFile}
        circularCrop={isCircle}
        title={modalTitle}
        compressOptions={compressOptions}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
        onError={(message) => onError?.({ kind: 'process-failed', message })}
      />
    </div>
  )
}
