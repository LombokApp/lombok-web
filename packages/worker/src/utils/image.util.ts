import type { ExifData } from 'exif'
import { ExifImage } from 'exif'

export const getExifTagsFromImage = (filePath: string): Promise<ExifData | undefined> => {
  return new Promise<ExifData>((resolve, reject) => {
    new ExifImage({ image: filePath }, (error, exifData) => {
      if (error) {
        if ((error as any)?.code === 'NO_EXIF_SEGMENT') {
          resolve({exif: {}, gps: {}, image: {}, interoperability: {}, makernote: {}, thumbnail: {} })
        }
        reject(error)
      } else {
        resolve(exifData)
      }
    })
  })
}

export const previewDimensionsForMaxDimension = ({
  width,
  height,
  maxDimension,
}: {
  width: number
  height: number
  maxDimension: number
}): {
  width: number
  height: number
} => {
  //   console.log('previewDimensionsFormaxDimension input:', { width, height })
  const maxDimensionFinal = Math.min(maxDimension, Math.min(width, height))
  //   console.log('previewDimensionsFormaxDimension maxDimension:', maxDimension)
  let h = height
  let w = width
  if (w > h) {
    if (w > maxDimensionFinal) {
      h *= maxDimensionFinal / w
      w = maxDimensionFinal
    }
  } else if (height > maxDimensionFinal) {
    w *= maxDimensionFinal / h
    h = maxDimensionFinal
  }

  w = Math.floor(w)
  h = Math.floor(h)
  const result = { width: w + (w % 2), height: h + (h % 2) }
  //   console.log('previewDimensionsFormaxDimension result:', result)
  return result
}
