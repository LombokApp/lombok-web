import 'react-image-crop/dist/ReactCrop.css'

import { Loader2, RotateCw, ZoomIn, ZoomOut } from 'lucide-react'
import React from 'react'
import type { Crop, PixelCrop } from 'react-image-crop'
import ReactCrop from 'react-image-crop'

import { Button } from '../button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../dialog'
import { Slider } from '../slider'
import type { CompressOptions } from './crop-image'
import { cropImageToWebpFile } from './crop-image'

const MIN_SOURCE_DIMENSION = 250
const MAX_ZOOM = 3

export interface ImageCropModalProps {
  open: boolean
  file: File | null
  /** Circular crop overlay (avatars) vs square (icons). */
  circularCrop?: boolean
  title?: string
  description?: string
  compressOptions?: CompressOptions
  onConfirm: (file: File) => Promise<void>
  onCancel: () => void
  /** Surfaced for source/processing problems; the host decides how to show it. */
  onError?: (message: string) => void
}

export function ImageCropModal({
  open,
  file,
  circularCrop = false,
  title,
  description,
  compressOptions,
  onConfirm,
  onCancel,
  onError,
}: ImageCropModalProps) {
  const imgRef = React.useRef<HTMLImageElement>(null)
  const cancelledRef = React.useRef(false)

  const [imgSrc, setImgSrc] = React.useState('')
  const [crop, setCrop] = React.useState<Crop>()
  const [completedCrop, setCompletedCrop] = React.useState<PixelCrop>()
  const [zoom, setZoom] = React.useState(1)
  const [rotate, setRotate] = React.useState(0)
  const [maxZoom, setMaxZoom] = React.useState(MAX_ZOOM)
  const [isSaving, setIsSaving] = React.useState(false)

  React.useEffect(() => {
    if (!open || !file) {
      return
    }
    cancelledRef.current = false
    const url = URL.createObjectURL(file)
    setImgSrc(url)
    return () => {
      URL.revokeObjectURL(url)
      setImgSrc('')
      setCrop(undefined)
      setCompletedCrop(undefined)
      setZoom(1)
      setRotate(0)
      setMaxZoom(MAX_ZOOM)
      setIsSaving(false)
    }
  }, [open, file])

  const onImageLoad = React.useCallback(
    (event: React.SyntheticEvent<HTMLImageElement>) => {
      const { naturalWidth, naturalHeight, width, height } = event.currentTarget
      const side = Math.min(width, height) * 0.9
      const initial: PixelCrop = {
        unit: 'px',
        width: side,
        height: side,
        x: (width - side) / 2,
        y: (height - side) / 2,
      }
      setCrop(initial)
      setCompletedCrop(initial)
      // Cap zoom so the selection can never represent fewer than 250 source px.
      const fit = Math.min(
        naturalWidth / MIN_SOURCE_DIMENSION,
        naturalHeight / MIN_SOURCE_DIMENSION,
      )
      setMaxZoom(Math.max(1, Math.min(MAX_ZOOM, fit)))
    },
    [],
  )

  const handleCancel = React.useCallback(() => {
    cancelledRef.current = true
    onCancel()
  }, [onCancel])

  const handleSave = React.useCallback(async () => {
    const image = imgRef.current
    if (!image || !completedCrop || completedCrop.width === 0) {
      onError?.('Choose a crop area first.')
      return
    }
    setIsSaving(true)
    let cropped: File
    try {
      cropped = await cropImageToWebpFile({
        image,
        crop: completedCrop,
        scale: zoom,
        rotate,
        fileName: file?.name ?? 'image.webp',
        options: compressOptions,
      })
    } catch {
      if (!cancelledRef.current) {
        onError?.('Could not process that image. Try a different one.')
      }
      setIsSaving(false)
      return
    }
    if (cancelledRef.current) {
      return
    }
    try {
      // Upload + result feedback is owned by the caller's onConfirm.
      await onConfirm(cropped)
    } finally {
      setIsSaving(false)
    }
  }, [completedCrop, compressOptions, file, onConfirm, onError, rotate, zoom])

  // displayed-px floor so the cropped region stays ≥250 source px at this zoom.
  const image = imgRef.current
  const scaleX = image?.width ? image.naturalWidth / image.width : 1
  const minCropDisplayed = Math.max(
    1,
    Math.ceil((MIN_SOURCE_DIMENSION * zoom) / scaleX),
  )

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          handleCancel()
        }
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title ?? 'Crop image'}</DialogTitle>
          <DialogDescription>
            {description ?? 'Adjust the zoom and position, then save.'}
          </DialogDescription>
        </DialogHeader>

        {imgSrc ? (
          <div className="flex flex-col gap-4">
            <div className="flex max-h-[60vh] items-center justify-center overflow-hidden rounded-md bg-muted/40 p-2">
              <ReactCrop
                crop={crop}
                onChange={(pixelCrop) => setCrop(pixelCrop)}
                onComplete={(pixelCrop) => setCompletedCrop(pixelCrop)}
                aspect={1}
                circularCrop={circularCrop}
                keepSelection
                minWidth={minCropDisplayed}
                minHeight={minCropDisplayed}
              >
                {/* Center-origin transform; the canvas reproduces it exactly. */}
                <img
                  ref={imgRef}
                  src={imgSrc}
                  alt=""
                  onLoad={onImageLoad}
                  style={{
                    transform: `scale(${zoom}) rotate(${rotate}deg)`,
                    maxHeight: '56vh',
                    maxWidth: '100%',
                  }}
                />
              </ReactCrop>
            </div>

            <div className="flex items-center gap-3">
              <ZoomOut className="size-4 shrink-0 text-muted-foreground" />
              <Slider
                value={[zoom]}
                min={1}
                max={maxZoom}
                step={0.01}
                disabled={maxZoom <= 1}
                onValueChange={([value]) => setZoom(value ?? 1)}
                aria-label="Zoom"
              />
              <ZoomIn className="size-4 shrink-0 text-muted-foreground" />
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="shrink-0"
                onClick={() => setRotate((current) => (current + 90) % 360)}
                aria-label="Rotate 90 degrees"
              >
                <RotateCw className="size-4" />
              </Button>
            </div>
          </div>
        ) : null}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => void handleSave()}
            disabled={isSaving || !completedCrop}
          >
            {isSaving ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
