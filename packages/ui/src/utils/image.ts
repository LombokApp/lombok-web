export interface MediaDimensions {
  width: number
  height: number
  lengthMilliseconds?: number
}

export const fileReaderFromBlob = (blob: Blob): Promise<FileReader> => {
  return new Promise((resolve) => {
    const f = new FileReader()
    f.onload = () => {
      resolve(f)
    }
    f.readAsDataURL(blob)
  })
}

export interface ResizedImage {
  blob: Blob
  width: number
  height: number
}

export enum CropType {
  NONE = 'none',
  SQUARE = 'square',
  VERTICAL = 'vertical',
  WIDESCREEN = 'widescreen',
}

interface CropConfig {
  cropType: CropType
  cropOffset?: { horizontal: 0; vertical: 0 }
}

export const calculateCropPositions = ({
  width,
  height,
  crop,
}: {
  crop: CropConfig
  width: number
  height: number
}) => {
  if (crop.cropType === CropType.SQUARE) {
    const dimension = Math.min(width, height)
    return {
      cropHeight: dimension,
      cropWidth: dimension,
      cropXOffset: (width - dimension) / 2,
      cropYOffset: (height - dimension) / 2,
    }
  } else if (crop.cropType === CropType.VERTICAL) {
    if (width > height) {
      const newWidth = height * (9 / 16)
      return {
        cropHeight: height,
        cropWidth: newWidth,
        cropXOffset: crop.cropOffset
          ? crop.cropOffset.horizontal
          : (width - newWidth) / 2,
        cropYOffset: 0,
      }
    } else {
      const newHeight = width / (9 / 16)
      return {
        cropHeight: newHeight,
        cropWidth: width,
        cropXOffset: 0,
        cropYOffset: crop.cropOffset
          ? crop.cropOffset.vertical
          : (height - newHeight) / 2,
      }
    }
  } else if (crop.cropType === CropType.WIDESCREEN) {
    if (height > width) {
      const newHeight = width * (9 / 16)
      return {
        cropWidth: width,
        cropHeight: newHeight,
        cropXOffset: 0,
        cropYOffset: crop.cropOffset
          ? crop.cropOffset.vertical
          : (height - newHeight) / 2,
      }
    } else {
      const newWidth = height / (9 / 16)
      return {
        cropWidth: newWidth,
        cropHeight: height,
        cropXOffset: crop.cropOffset
          ? crop.cropOffset.horizontal
          : (width - newWidth) / 2,
        cropYOffset: 0,
      }
    }
  }
  return {
    cropWidth: width,
    cropHeight: height,
    cropXOffset: 0,
    cropYOffset: 0,
  }
}
