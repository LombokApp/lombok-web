import type { FolderObjectData } from '@stellariscloud/api-client'
import { MediaType } from '@stellariscloud/types'
import {
  mediaTypeFromExtension,
  mediaTypeFromMimeType,
} from '@stellariscloud/utils'
import Image from 'next/image'
import React from 'react'

import { AudioPlayer } from '../../components/audio-player/audio-player'
import { VideoPlayer } from '../../components/video-player/video-player'
import { useLocalFileCacheContext } from '../../contexts/local-file-cache.context'
import { Icon } from '../../design-system/icon'
import { foldersApi } from '../../services/api'
import { iconForMediaType } from '../../utils/icons'

export const FolderObjectPreview = ({
  folderId,
  objectKey,
  previewObjectKey,
  displayMode = 'object-contain',
  objectMetadata,
}: {
  folderId: string
  objectKey: string
  objectMetadata?: FolderObjectData
  previewObjectKey: string | undefined
  displayMode?: string
}) => {
  const [folderObject, setFolderObject] = React.useState<
    FolderObjectData | undefined
  >(objectMetadata)
  const fileName = objectKey.split('/').at(-1)
  const [file, setFile] = React.useState<
    | {
        previewObjectKey: string
        dataURL: string
        type: string
      }
    | false
  >()
  const { getData } = useLocalFileCacheContext()

  React.useEffect(() => {
    if (folderId && objectKey && !folderObject) {
      void foldersApi
        .getFolderObject({ folderId, objectKey })
        .then((response) => {
          setFolderObject(response.data)
        })
    }
  }, [folderId, objectKey, folderObject])

  React.useEffect(() => {
    if (!file && previewObjectKey) {
      void getData(folderId, previewObjectKey).then((f) => {
        if (f) {
          setFile({ previewObjectKey, dataURL: f.dataURL, type: f.type })
        }
      })
    }
  }, [file, folderId, getData, previewObjectKey])

  if (file === undefined) {
    return <></>
  }

  const contentAttributes =
    folderObject?.hash && folderObject.hash in folderObject.contentAttributes
      ? folderObject.contentAttributes[folderObject.hash]
      : undefined

  const mimeType =
    folderObject?.hash && contentAttributes
      ? contentAttributes.mimeType
      : undefined

  const dataURL = file === false ? undefined : file.dataURL
  const mediaType = mimeType
    ? mediaTypeFromMimeType(mimeType)
    : mediaTypeFromExtension(folderObject?.objectKey.split('.').at(-1) ?? '')

  return file && dataURL && mediaType === MediaType.Image ? (
    <div className="relative w-full h-full">
      <Image
        className={displayMode}
        fill
        alt={fileName ?? objectKey}
        src={dataURL}
      />
    </div>
  ) : file && dataURL && mediaType === MediaType.Video ? (
    <div className="flex justify-center">
      <VideoPlayer
        className="object-cover"
        width="100%"
        height="100%"
        controls
        src={dataURL}
      />
    </div>
  ) : file && dataURL && mediaType === MediaType.Audio ? (
    <div className="flex w-full h-full justify-center items-center p-4">
      <div className="sm:w-full sm:h-full lg:h-[80%] lg:w-[80%] xl:h-[60%] xl:w-[60%]">
        <AudioPlayer width="100%" height="100%" controls src={dataURL} />
      </div>
    </div>
  ) : (
    <div className="flex flex-col w-full h-full items-center justify-around bg-black text-white">
      <Icon size={'xl'} icon={iconForMediaType(mediaType)} />
    </div>
  )
}
