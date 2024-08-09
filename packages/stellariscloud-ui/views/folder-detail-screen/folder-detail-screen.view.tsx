import { ArrowPathIcon, TrashIcon, UsersIcon } from '@heroicons/react/20/solid'
import {
  ArrowUpOnSquareIcon,
  DocumentTextIcon,
  FolderIcon,
  MapPinIcon,
} from '@heroicons/react/24/outline'
import { FolderObjectDTO } from '@stellariscloud/api-client'
import { FolderPermissionEnum } from '@stellariscloud/types'
import { FolderPushMessage, MediaType } from '@stellariscloud/types'
import type {
  AudioMediaMimeTypes,
  ImageMediaMimeTypes,
  VideoMediaMimeTypes,
} from '@stellariscloud/utils'
import {
  AUDIO_MEDIA_MIME_TYPES,
  formatBytes,
  IMAGE_MEDIA_MIME_TYPES,
  mediaTypeFromMimeType,
  VIDEO_MEDIA_MIME_TYPES,
} from '@stellariscloud/utils'
import clsx from 'clsx'
import { useRouter } from 'next/router'
import React from 'react'
import useDebounce from 'react-use/lib/useDebounce'

import { ConfirmForgetFolderModal } from '../../components/confirm-forget-folder-modal/confirm-forget-folder-modal'
import { ConfirmRefreshFolderModal } from '../../components/confirm-refresh-folder-modal/confirm-refresh-folder-modal'
import { FolderEmptyState } from '../../components/folder-empty-state/folder-empty-state'
import { FolderScroll } from '../../components/folder-scroll/folder-scroll'
import { UploadModal } from '../../components/upload-modal/upload-modal'
import { useFolderContext } from '../../contexts/folder.context'
import { useLocalFileCacheContext } from '../../contexts/local-file-cache.context'
import { Button } from '../../design-system/button/button'
import { Icon } from '../../design-system/icon'
import { PageHeading } from '../../design-system/page-heading/page-heading'
import { useWindowDimensions } from '../../hooks/use-window-dimensions'
import { apiClient } from '../../services/api'
import { FolderObjectDetailScreen } from '../folder-object-detail-screen/folder-object-detail-screen.view'
import type { FolderSidebarTab } from '../folder-sidebar/folder-sidebar.view'
import { FolderSidebar } from '../folder-sidebar/folder-sidebar.view'

const SCROLL_JUMP_ROWS_CUTTOFF = 10
const ROW_BUFFER_SIZE = 3
const BOTTOM_SCROLL_BUFFER = 50
const INITIAL_SCROLL_HEIGHT = 50000
const CARD_PADDING_SIZE = 10

interface ObjectsViewContext {
  windowHeight: number
  windowWidth: number
  itemsPerRow: number
  scrollViewHeight: number
  scrollTopPercentage: number
  itemSize: number
  topMargin: number
  start: number
  end: number
  startRow: number
  endRow: number
}

const itemsPerRowForWidth = (
  contentWidth: number,
  minimumItemWidth: number,
) => {
  const itemsPerRow = Math.max(Math.floor(contentWidth / minimumItemWidth), 1)
  const itemSize = Math.floor(contentWidth / itemsPerRow)
  return { itemSize, itemsPerRow }
}

const buildLinkWrapper = (
  onClick: (folderId: string, objectKey: string) => void,
  folderId: string,
  objectKey: string,
) => {
  const a = document.createElement('a')
  a.href = `/folders/${folderId}/${encodeURIComponent(objectKey)}`
  a.onclick = (e) => {
    e.preventDefault()
    onClick(folderId, objectKey)
  }
  return a
}

const createIcon = (d: string) => {
  const iconSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  const iconPath = document.createElementNS(
    'http://www.w3.org/2000/svg',
    'path',
  )
  iconSvg.setAttribute('fill', 'none')
  iconSvg.setAttribute('viewBox', '0 0 24 24')
  iconSvg.setAttribute('stroke', 'white')
  iconPath.setAttribute('d', d)
  iconPath.setAttribute('stroke-linecap', 'round')
  iconPath.setAttribute('stroke-linejoin', 'round')
  iconPath.setAttribute('stroke-width', '1')
  iconSvg.appendChild(iconPath)
  return iconSvg
}

const createAudioIcon = () =>
  createIcon(
    'M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z',
  )
const createImageIcon = () =>
  createIcon(
    'M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z',
  )
const createDocumentIcon = () =>
  createIcon(
    'M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z',
  )
const createVideoIcon = () =>
  createIcon(
    'M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h1.5C5.496 19.5 6 18.996 6 18.375m-3.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-1.5A1.125 1.125 0 0118 18.375M20.625 4.5H3.375m17.25 0c.621 0 1.125.504 1.125 1.125M20.625 4.5h-1.5C18.504 4.5 18 5.004 18 5.625m3.75 0v1.5c0 .621-.504 1.125-1.125 1.125M3.375 4.5c-.621 0-1.125.504-1.125 1.125M3.375 4.5h1.5C5.496 4.5 6 5.004 6 5.625m-3.75 0v1.5c0 .621.504 1.125 1.125 1.125m0 0h1.5m-1.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m1.5-3.75C5.496 8.25 6 7.746 6 7.125v-1.5M4.875 8.25C5.496 8.25 6 8.754 6 9.375v1.5m0-5.25v5.25m0-5.25C6 5.004 6.504 4.5 7.125 4.5h9.75c.621 0 1.125.504 1.125 1.125m1.125 2.625h1.5m-1.5 0A1.125 1.125 0 0118 7.125v-1.5m1.125 2.625c-.621 0-1.125.504-1.125 1.125v1.5m2.625-2.625c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125M18 5.625v5.25M7.125 12h9.75m-9.75 0A1.125 1.125 0 016 10.875M7.125 12C6.504 12 6 12.504 6 13.125m0-2.25C6 11.496 5.496 12 4.875 12M18 10.875c0 .621-.504 1.125-1.125 1.125M18 10.875c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125m-12 5.25v-5.25m0 5.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125m-12 0v-1.5c0-.621-.504-1.125-1.125-1.125M18 18.375v-5.25m0 5.25v-1.5c0-.621.504-1.125 1.125-1.125M18 13.125v1.5c0 .621.504 1.125 1.125 1.125M18 13.125c0-.621.504-1.125 1.125-1.125M6 13.125v1.5c0 .621-.504 1.125-1.125 1.125M6 13.125C6 12.504 5.496 12 4.875 12m-1.5 0h1.5m-1.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125M19.125 12h1.5m0 0c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h1.5m14.25 0h1.5',
  )

const createLoadingIconRaw = (size: 'sm' | 'md' | 'lg' = 'sm') => {
  const sizeNum =
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    size === 'sm' ? 32 : size === 'md' ? 64 : size === 'lg' ? '128' : 32
  return `<svg width="${sizeNum}" height="${sizeNum}" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12,1A11,11,0,1,0,23,12,11,11,0,0,0,12,1Zm0,19a8,8,0,1,1,8-8A8,8,0,0,1,12,20Z" opacity=".25"/><path d="M10.72,19.9a8,8,0,0,1-6.5-9.79A7.77,7.77,0,0,1,10.4,4.16a8,8,0,0,1,9.49,6.52A1.54,1.54,0,0,0,21.38,12h.13a1.37,1.37,0,0,0,1.38-1.54,11,11,0,1,0-12.7,12.39A1.54,1.54,0,0,0,12,21.34h0A1.47,1.47,0,0,0,10.72,19.9Z"><animateTransform attributeName="transform" type="rotate" dur="0.75s" values="0 12 12;360 12 12" repeatCount="indefinite"/></path></svg>`
}

const iconForMimeType = (mimeType?: string) => {
  if (!mimeType) {
    return createDocumentIcon()
  }
  if (AUDIO_MEDIA_MIME_TYPES.includes(mimeType as AudioMediaMimeTypes)) {
    return createAudioIcon()
  } else if (IMAGE_MEDIA_MIME_TYPES.includes(mimeType as ImageMediaMimeTypes)) {
    return createImageIcon()
  } else if (VIDEO_MEDIA_MIME_TYPES.includes(mimeType as VideoMediaMimeTypes)) {
    return createVideoIcon()
  }
  return createDocumentIcon()
}

const renderFolderObjectPreview = (
  onClick: (folderId: string, objectKey: string) => void,
  getData: (
    folderId: string,
    objectKey: string,
  ) => {
    filePromise?: Promise<{ dataURL: string; type: string } | undefined>
    file?: { dataURL: string; type: string }
  },
  position: number,
  folderObject: FolderObjectDTO,
  forcePreviewRerender: boolean = false,
) => {
  const contentWrapperDiv = document.getElementById(
    `display-position-${position}`,
  )
  if (!contentWrapperDiv) {
    return
  }

  if (contentWrapperDiv.getAttribute('x-data-rendered') !== '1') {
    contentWrapperDiv.innerHTML = ''
  }

  const linkElement = buildLinkWrapper(
    onClick,
    folderObject.folderId,
    folderObject.objectKey,
  )
  contentWrapperDiv.append(linkElement)

  const currentVersionMetadata =
    folderObject.hash && folderObject.contentMetadata[folderObject.hash]
      ? folderObject.contentMetadata[folderObject.hash] ?? {}
      : {}

  const getDataResult =
    folderObject.folderId &&
    folderObject.hash &&
    currentVersionMetadata.thumbnailLg?.hash
      ? getData(
          folderObject.folderId,
          `metadata:${folderObject.objectKey}:${currentVersionMetadata.thumbnailLg.hash}`,
        )
      : undefined

  if (
    contentWrapperDiv.getAttribute('x-data-preview-rendered') !== '1' ||
    forcePreviewRerender
  ) {
    if (
      getDataResult?.file?.dataURL &&
      getDataResult.file.type &&
      mediaTypeFromMimeType(getDataResult.file.type) === MediaType.Image
    ) {
      contentWrapperDiv.setAttribute('x-data-preview-rendered', '1')
      const image = new Image()
      linkElement.append(image)
      image.className = 'object-cover'
      image.style.position = 'absolute'
      image.style.height = '100%'
      image.style.width = '100%'
      image.style.top = '0'
      image.style.left = '0'
      image.style.bottom = '0'
      image.style.right = '0'
      image.setAttribute('alt', folderObject.objectKey)
      image.setAttribute('src', getDataResult.file.dataURL)
    } else if (
      getDataResult?.file?.dataURL &&
      getDataResult.file.type &&
      mediaTypeFromMimeType(getDataResult.file.type) === MediaType.Video
    ) {
      contentWrapperDiv.setAttribute('x-data-preview-rendered', '1')
      const video = document.createElement('video')
      linkElement.append(video)
      video.className = 'object-cover'
      video.style.position = 'absolute'
      video.style.height = '100%'
      video.style.width = '100%'
      video.style.top = '0'
      video.style.left = '0'
      video.style.bottom = '0'
      video.style.right = '0'
      video.setAttribute('alt', folderObject.objectKey)
      video.setAttribute('src', getDataResult.file.dataURL)
    } else {
      if (getDataResult?.filePromise && !getDataResult.file) {
        const downloadingIcon = document.createElement('div')
        downloadingIcon.innerHTML = createLoadingIconRaw()
        downloadingIcon.style.opacity = '0.4'
        downloadingIcon.setAttribute(
          'class',
          'absolute h-full w-full p-8 flex flex-col justify-start items-end stroke-white fill-white',
        )
        linkElement.append(downloadingIcon)
      }

      const icon = iconForMimeType(folderObject.mimeType)
      const iconDiv = document.createElement('div')
      iconDiv.setAttribute('class', 'absolute h-full w-full')

      iconDiv.style.padding = '1.2em'
      iconDiv.append(icon)
      linkElement.append(iconDiv)
    }
  }

  if (!getDataResult?.file && getDataResult?.filePromise) {
    void getDataResult.filePromise.then((file) => {
      renderFolderObjectPreview(
        onClick,
        () => ({ file }),
        position,
        folderObject,
        true,
      )
    })
  }

  // info overlay
  const infoOverlay = document.createElement('div')
  linkElement.append(infoOverlay)

  if (!folderObject.hash) {
    const buttonDiv = document.createElement('div')
    const reindexButton = document.createElement('button')
    reindexButton.type = 'button'
    reindexButton.onclick = (e) => {
      e.stopPropagation()
      e.preventDefault()
      // void foldersApi.enqueueFolderOperation({
      //   folderId: folderObject.folderId,
      //   folderOperationRequestPayload: {
      //     operationName: FolderOperationName.IndexFolderObject,
      //     operationData: {
      //       folderId: folderObject.folderId,
      //       objectKey: folderObject.objectKey,
      //     },
      //   },
      // })
    }
    reindexButton.innerHTML = `<svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      stroke-width="1.5"
      stroke="currentColor"
      class="w-6 h-6"
    >
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
      />
    </svg>`
    reindexButton.setAttribute(
      'class',
      'text-sm p-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white focus-visible:outline-indigo-600',
    )

    buttonDiv.append(reindexButton)
    buttonDiv.setAttribute(
      'class',
      'absolute h-full w-full p-4 flex flex-col justify-start items-end',
    )

    linkElement.append(buttonDiv)
  }

  infoOverlay.style.position = 'absolute'
  infoOverlay.setAttribute(
    'class',
    'w-full h-full flex flex-col p-2 px-4 text-[1rem] font-bold shadow-md text-white justify-end top-0 left-0 right-0 bottom-0',
  )
  const infoContent = document.createElement('div')
  const titleWrapper = document.createElement('div')
  const sizeWrapper = document.createElement('div')
  const splitObjectKey = folderObject.objectKey.split('/')
  titleWrapper.append(
    document.createTextNode(
      splitObjectKey.length > 1
        ? splitObjectKey.slice(1).join('/')
        : folderObject.objectKey,
    ),
  )
  sizeWrapper.append(
    document.createTextNode(formatBytes(folderObject.sizeBytes)),
  )
  infoContent.append(titleWrapper)
  infoContent.append(sizeWrapper)
  infoOverlay.append(infoContent)

  contentWrapperDiv.setAttribute('x-data-rendered', '1')
}

const renderTile = (
  handleObjectLinkClick: (folderId: string, objectKey: string) => void,
  container: HTMLDivElement,
  position: number,
  tileSize: number,
  renderAsFirstChild: boolean,
  getFolderObjectForPosition: (position: number) => FolderObjectDTO | undefined,
  getData: (
    folderId: string,
    objectKey: string,
  ) => {
    filePromise?: Promise<{ dataURL: string; type: string } | undefined>
    file?: { dataURL: string; type: string }
  },
) => {
  const itemContainerDiv = document.createElement('div')
  itemContainerDiv.id = `container-position-${position}`

  itemContainerDiv.setAttribute('x-data-id', `${position}`)
  itemContainerDiv.style.height = `${tileSize - CARD_PADDING_SIZE}px`
  itemContainerDiv.style.width = `${tileSize - CARD_PADDING_SIZE}px`
  itemContainerDiv.style.borderRadius = `5px`
  itemContainerDiv.style.overflow = `hidden`
  itemContainerDiv.style.marginLeft = `${CARD_PADDING_SIZE}px`
  itemContainerDiv.style.marginBottom = `${CARD_PADDING_SIZE}px`
  itemContainerDiv.style.fontSize = `6rem`
  itemContainerDiv.style.position = `relative`
  itemContainerDiv.className = `bg-black/[15%] dark:bg-white/[2%]`

  const folderObject = getFolderObjectForPosition(position)

  // preview content
  const contentPreviewDiv = document.createElement('div')
  contentPreviewDiv.id = `display-position-${position}`
  contentPreviewDiv.style.position = `absolute`
  contentPreviewDiv.style.top = `0`
  contentPreviewDiv.style.left = `0`
  contentPreviewDiv.style.bottom = `0`
  contentPreviewDiv.style.right = `0`
  contentPreviewDiv.style.height = `100%`
  contentPreviewDiv.style.width = `100%`

  if (!folderObject) {
    const loadingIcon = document.createElement('div')
    loadingIcon.innerHTML = createLoadingIconRaw('lg')
    loadingIcon.style.opacity = '0.05'
    loadingIcon.setAttribute(
      'class',
      'absolute h-full w-full flex flex-col justify-around items-center stroke-white fill-white',
    )
    contentPreviewDiv.append(loadingIcon)
  }

  itemContainerDiv.append(contentPreviewDiv)

  if (!renderAsFirstChild) {
    container.append(itemContainerDiv)
  } else {
    container.prepend(itemContainerDiv)
  }

  // kick off a preview content render here if folderObject already exists
  if (folderObject) {
    renderFolderObjectPreview(
      handleObjectLinkClick,
      getData,
      position,
      folderObject,
    )
  }
}

const renderTileSequence = (
  handleObjectLinkClick: (
    folderId: string,
    objectKey: string,
    index: number,
  ) => void,
  container: HTMLDivElement,
  tileSize: number,
  start: number,
  end: number,
  renderAsFirstChild: boolean,
  getFolderObjectForPosition: (position: number) => FolderObjectDTO | undefined,
  getData: (
    folderId: string,
    objectKey: string,
  ) => {
    filePromise?: Promise<{ dataURL: string; type: string } | undefined>
    file?: { dataURL: string; type: string }
  },
) => {
  // console.log('add tiles from %d to %d', start, end)
  const indexArray: number[] = new Array(end - start + 1)
    .fill(0)
    .map((i, positionIndex) => start + positionIndex)

  const finalArray = renderAsFirstChild ? indexArray.reverse() : indexArray

  // console.log('renderTileSequence', finalArray)

  finalArray.forEach((positionIndex) => {
    renderTile(
      (f, o) => handleObjectLinkClick(f, o, positionIndex),
      container,
      positionIndex,
      tileSize,
      renderAsFirstChild,
      getFolderObjectForPosition,
      getData,
    )
  })
}

const removeTileSequence = (
  container: HTMLDivElement,
  removeCount: number,
  removeFromStart: boolean = false,
) => {
  // console.log(
  //   'remove %d tiles from %s',
  //   removeCount,
  //   removeFromStart ? 'start' : 'end',
  // )
  const childCount = container.childNodes.length
  const nodesToRemove = []
  for (let i = 0; i < removeCount; i++) {
    const p = container.childNodes.item(
      removeFromStart ? i : childCount - i - 1,
    ) as ChildNode | undefined
    nodesToRemove.push(p)
  }
  nodesToRemove
    .filter((n) => !!n)
    .forEach((n) => {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      container.removeChild(n!)
    })
}

const updateRenderedTiles = (
  handleObjectLinkClick: (
    folderId: string,
    objectKey: string,
    index: number,
  ) => void,
  container: HTMLDivElement,
  tileSize: number,
  renderIndexStart: number,
  renderIndexEnd: number,
  getFolderObjectForPosition: (position: number) => FolderObjectDTO | undefined,
  getData: (
    folderId: string,
    objectKey: string,
  ) => {
    filePromise?: Promise<{ dataURL: string; type: string } | undefined>
    file?: { dataURL: string; type: string }
  },
) => {
  // console.log('Rendering %d to %d', renderIndexStart, renderIndexEnd)
  // check what is currently rendered
  const firstDataId = parseInt(
    (container.firstChild as HTMLElement | undefined)?.getAttribute(
      'x-data-id',
    ) ?? '-1',
    10,
  )
  const lastDataId = parseInt(
    (container.lastChild as HTMLElement | undefined)?.getAttribute(
      'x-data-id',
    ) ?? '-1',
    10,
  )

  // add/remove tiles
  if (firstDataId === -1) {
    // nothing rendered
    renderTileSequence(
      handleObjectLinkClick,
      container,
      tileSize,
      renderIndexStart,
      renderIndexEnd,
      false,
      getFolderObjectForPosition,
      getData,
    )
  } else {
    if (firstDataId > renderIndexStart) {
      // add tiles to the start
      // console.log(
      //   'Adding tiles from position %d to %d',
      //   renderIndexStart,
      //   firstDataId - 1,
      // )
      renderTileSequence(
        handleObjectLinkClick,
        container,
        tileSize,
        renderIndexStart,
        firstDataId - 1,
        true,
        getFolderObjectForPosition,
        getData,
      )
    } else if (firstDataId < renderIndexStart) {
      // remove tiles from the start
      // console.log('renderIndexStart:', renderIndexStart)
      // console.log('firstDataId:', firstDataId)
      removeTileSequence(container, renderIndexStart - firstDataId, true)
    }
    if (lastDataId < renderIndexEnd) {
      // add tiles to the end
      renderTileSequence(
        handleObjectLinkClick,
        container,
        tileSize,
        lastDataId + 1,
        renderIndexEnd,
        false,
        getFolderObjectForPosition,
        getData,
      )
    } else if (lastDataId > renderIndexEnd) {
      // remove tiles from the end
      // console.log('renderIndexEnd:', renderIndexEnd)
      // console.log('lastDataId:', lastDataId)
      removeTileSequence(container, lastDataId - renderIndexEnd)
    }
  }

  // console.log('firstDataId:', firstDataId)
  // console.log('lastDataId:', lastDataId)
}

export const FolderDetailScreen = () => {
  const router = useRouter()
  const [isResizing, setIsResizing] = React.useState(false)
  // const [_folderWebsocket, setFolderWebsocket] = React.useState<Socket>()
  const [_shareModalOpen, setShareModalOpen] = React.useState(false)
  const [sidebarTab, setSidebarTab] =
    React.useState<FolderSidebarTab>('overview')

  const [refreshFolderConfirmationOpen, setRefreshFolderConfirmationOpen] =
    React.useState(false)
  const [uploadOpen, setUploadOpen] = React.useState(false)
  const [forgetFolderConfirmationOpen, setForgetFolderConfirmationOpen] =
    React.useState(false)

  const [surroundingFocusedContext, setSurroundingFocusedContext] =
    React.useState<{ next: number; previous: number }>()
  const [focusedObjectKey, setFocusedObjectKey] = React.useState<string>()
  const focusedObjectKeyRef = React.useRef<string>()

  const [sidebarOpen, _setSidebarOpen] = React.useState(true)

  const [pageState, setPageState] = React.useState<{
    search?: string
    filterTagId?: string
  }>({
    search: router.query.search as string | undefined,
    filterTagId: router.query.search as string | undefined,
  })
  const [searchTerm, setSearchTerm] = React.useState(
    (router.query.search as string | undefined) ?? undefined,
  )

  const [pageSize] = React.useState<number>(100)

  const mainContainerRef = React.useRef<HTMLDivElement>(null)
  const scrollContainerRef = React.useRef<HTMLDivElement>(null)
  const scrollContainerParentRef = React.useRef<HTMLDivElement>(null)
  const tileContainerRef = React.useRef<HTMLDivElement>(null)
  const windowDimensions = useWindowDimensions()
  const folderObjects = React.useRef<{
    results: {
      [key: string]: FolderObjectDTO | undefined
    }
    positions: {
      [objectKey: string]: number
    }
    folderRequests: {
      [objectKey: string]: { time: number; success?: boolean } | undefined
    }
    fetched: boolean
    totalCount?: number
    searchTerm?: string
    filterTagId?: string
  }>({ results: {}, positions: {}, folderRequests: {}, fetched: false })
  const {
    recalculateLocalStorageFolderSizes,
    purgeLocalStorageForFolder,
    getData,
    uploadFile,
    uploadingProgress,
  } = useLocalFileCacheContext()

  const [objectsViewContext, setObjectsViewContext] =
    React.useState<ObjectsViewContext>()

  const handleObjectLinkClick = React.useCallback(
    (fId: string, objectKey: string, index: number) => {
      setSurroundingFocusedContext({ next: index + 1, previous: index - 1 })
      void router.push(
        {
          pathname: `/folders/${router.query.folderId}/${encodeURIComponent(
            objectKey,
          )}`,
        },
        undefined,
        { shallow: true },
      )
    },
    [router],
  )

  const handleScroll = React.useCallback(
    (_e?: React.UIEvent) => {
      // console.log('handleScroll', folderObjects.current.totalCount)
      if (isResizing) {
        return
      }
      if (!folderObjects.current.totalCount) {
        return
      }
      const contentWidth = scrollContainerRef.current
        ? scrollContainerRef.current.clientWidth
        : 0
      const { itemSize, itemsPerRow } = itemsPerRowForWidth(
        contentWidth - 30,
        300,
      )
      const viewContext = {
        itemSize,
        windowHeight: windowDimensions.innerHeight,
        windowWidth: windowDimensions.innerWidth,
        itemsPerRow,
        topMargin: 0,
      }
      const scrollTop = scrollContainerRef.current?.scrollTop ?? 0
      const scrollContainerParentHeight =
        scrollContainerParentRef.current?.clientHeight ?? 0
      if (viewContext.itemSize) {
        const offsetRows = parseInt(
          (scrollContainerRef.current?.getAttribute('x-data-offset-rows') as
            | string
            | undefined) ?? '0',
          10,
        )
        const firstVisibleRow =
          Math.floor(scrollTop / viewContext.itemSize) + offsetRows
        const lastVisibleRow =
          Math.floor(scrollContainerParentHeight / viewContext.itemSize) +
          firstVisibleRow
        const totalRows = Math.ceil(
          folderObjects.current.totalCount / viewContext.itemsPerRow,
        )

        const startRow = Math.min(Math.max(0, firstVisibleRow), totalRows)

        const endRow = Math.min(totalRows, lastVisibleRow + ROW_BUFFER_SIZE)
        const end = Math.min(
          (endRow + 1) * viewContext.itemsPerRow - 1,
          folderObjects.current.totalCount - 1,
        )

        const start = Math.min(
          Math.max(0, startRow * viewContext.itemsPerRow),
          folderObjects.current.totalCount - 1,
        )
        const range = { startRow, endRow, start, end }

        if (scrollContainerRef.current && tileContainerRef.current) {
          let additionalOffsetRows = 0
          const rowsOffsetWithTopMargin = startRow - offsetRows
          if (rowsOffsetWithTopMargin >= SCROLL_JUMP_ROWS_CUTTOFF) {
            additionalOffsetRows = Math.floor(rowsOffsetWithTopMargin / 2)
          } else if (
            offsetRows > 0 &&
            rowsOffsetWithTopMargin < SCROLL_JUMP_ROWS_CUTTOFF / 2
          ) {
            additionalOffsetRows = -(SCROLL_JUMP_ROWS_CUTTOFF / 2)
          }
          if (additionalOffsetRows !== 0) {
            scrollContainerRef.current.setAttribute(
              'x-data-offset-rows',
              `${Math.max(0, offsetRows + additionalOffsetRows)}`,
            )

            const newScrollPoint =
              scrollContainerRef.current.scrollTop -
              additionalOffsetRows * viewContext.itemSize

            scrollContainerRef.current.scroll({
              top: newScrollPoint,
            })
          }

          viewContext.topMargin =
            (range.startRow - (offsetRows + additionalOffsetRows)) *
            viewContext.itemSize

          scrollContainerRef.current.style.paddingTop = `${viewContext.topMargin}px`

          updateRenderedTiles(
            handleObjectLinkClick,
            tileContainerRef.current,
            viewContext.itemSize,
            range.start,
            range.end,
            (position: number) => folderObjects.current.results[position],
            (fId: string, objectKey: string) => ({
              filePromise: getData(fId, objectKey),
            }),
          )

          // stop scrolling when we hit the end
          const lastTileContainer = document.getElementById(
            `container-position-${folderObjects.current.totalCount - 1}`,
          )

          if (lastTileContainer) {
            const lastTileOffset =
              lastTileContainer.getBoundingClientRect().bottom +
              BOTTOM_SCROLL_BUFFER -
              scrollContainerRef.current.getBoundingClientRect().top
            if (lastTileOffset <= scrollContainerParentHeight) {
              const newHeight =
                viewContext.itemSize * (range.endRow - range.startRow) +
                BOTTOM_SCROLL_BUFFER +
                (viewContext.topMargin > 0
                  ? Math.max(
                      0,
                      viewContext.topMargin - scrollContainerParentHeight,
                    )
                  : 0)
              tileContainerRef.current.style.height = `${newHeight}px`
            } else if (
              tileContainerRef.current.style.height !==
              `${INITIAL_SCROLL_HEIGHT}px`
            ) {
              tileContainerRef.current.style.height = `${INITIAL_SCROLL_HEIGHT}px`
            }
          } else if (
            tileContainerRef.current.style.height !==
            `${INITIAL_SCROLL_HEIGHT}px`
          ) {
            tileContainerRef.current.style.height = `${INITIAL_SCROLL_HEIGHT}px`
          }
        }
        const scrollOffset = offsetRows * viewContext.itemSize + scrollTop
        const scrollContentHeightPx = totalRows * viewContext.itemSize
        const scrollViewHeight = Math.max(
          scrollContainerParentHeight / scrollContentHeightPx,
          0.05,
        )

        const scrollTopPercentage =
          scrollOffset === 0
            ? 0
            : Math.min(
                1,
                scrollOffset /
                  (scrollContentHeightPx - scrollContainerParentHeight),
              )

        setObjectsViewContext({
          ...viewContext,
          startRow,
          scrollTopPercentage,
          scrollViewHeight,
          endRow,
          start,
          end,
        })
      }
    },
    [
      windowDimensions.innerHeight,
      windowDimensions.innerWidth,
      isResizing,
      getData,
      handleObjectLinkClick,
    ],
  )

  const fetchFolderObjects = React.useCallback(
    async (offset: number) => {
      // if search parameters have changed, reset everything...
      if (searchTerm !== folderObjects.current.searchTerm) {
        folderObjects.current.results = {}
        folderObjects.current.positions = {}
        folderObjects.current.folderRequests = {}
        folderObjects.current.searchTerm = searchTerm
        folderObjects.current.totalCount = undefined
        if (tileContainerRef.current) {
          tileContainerRef.current.innerHTML = ''
        }
      }
      folderObjects.current.fetched = true

      let haveFirstN = 0
      for (let i = offset; i < offset + pageSize; i++) {
        if (!(i in folderObjects.current.results)) {
          break
        }
        haveFirstN++
      }
      if (haveFirstN === pageSize) {
        // have everything already
        return
      }
      const actualOffset = offset + haveFirstN

      const limit = Math.max(pageSize - haveFirstN, 50) // don't request less than 25

      // check there's no recent outstanding request matching this one
      const requestKey = `${actualOffset}_${limit}`
      const outstandingRequest =
        folderObjects.current.folderRequests[requestKey]
      if (
        outstandingRequest &&
        (outstandingRequest.success ||
          outstandingRequest.time > Date.now() - 10 * 1000)
      ) {
        return
      }

      folderObjects.current.folderRequests[requestKey] = { time: Date.now() }

      await apiClient.foldersApi
        .listFolderObjects({
          folderId: router.query.folderId as string,
          offset: Math.max(offset + haveFirstN, 0),
          limit,
          search: searchTerm,
        })
        .then((response) => {
          if (searchTerm !== folderObjects.current.searchTerm) {
            // search parameters have changed since this request was executed...
            return
          }

          // set last known total result size for this query
          folderObjects.current.totalCount = response.data.meta.totalCount

          // set the result for each object in its position
          response.data.result.forEach((folderObject, i) => {
            // console.log('rendering: %s', folderObject.objectKey)
            const viewPositionIndex = offset + haveFirstN + i
            if (!(viewPositionIndex in folderObjects.current.results)) {
              folderObjects.current.results[viewPositionIndex] = folderObject
              folderObjects.current.positions[folderObject.objectKey] =
                viewPositionIndex
              if (tileContainerRef.current) {
                // kick-off preview render
                renderFolderObjectPreview(
                  (f, o) => handleObjectLinkClick(f, o, viewPositionIndex),
                  (f, o) => ({ filePromise: getData(f, o) }),
                  viewPositionIndex,
                  folderObject,
                )
              }
            }
          })
        })
    },
    [
      pageSize,
      searchTerm,
      getData,
      router.query.folderId,
      handleObjectLinkClick,
    ],
  )

  const messageHandler = React.useCallback(
    (name: FolderPushMessage, payload: { [key: string]: any }) => {
      if (
        [
          FolderPushMessage.OBJECTS_ADDED,
          FolderPushMessage.OBJECTS_REMOVED,
          FolderPushMessage.OBJECT_ADDED,
          FolderPushMessage.OBJECT_REMOVED,
        ].includes(name)
      ) {
        if (tileContainerRef.current) {
          tileContainerRef.current.innerHTML = ''
        }
        folderObjects.current = {
          results: {},
          positions: {},
          folderRequests: {},
          fetched: false,
        }
        setObjectsViewContext(undefined)
      } else if (FolderPushMessage.OBJECT_UPDATED === name) {
        const folderObject = payload as FolderObjectDTO
        if (folderObject.objectKey in folderObjects.current.positions) {
          const position =
            folderObjects.current.positions[folderObject.objectKey]
          folderObjects.current.results[position] = folderObject
          renderFolderObjectPreview(
            (f, o) => handleObjectLinkClick(f, o, position),
            (f, o) => ({ filePromise: getData(f, o) }),
            position,
            folderObject,
            true,
          )
        }
      }
    },
    [getData, handleObjectLinkClick],
  )
  const folderContext = useFolderContext(messageHandler)

  const handleIndexAll = () => {
    // TODO: replace
    // void foldersApi.indexAllContent({ folderId: folderContext.folderId })
  }

  React.useEffect(() => {
    const changedPageState: { search?: string; filterTagId?: string } = {}
    const searchInQuery =
      (router.query.search?.length ?? 0) > 0
        ? (router.query.search as string)
        : undefined
    if (searchInQuery !== pageState.search) {
      changedPageState.search = pageState.search
    }
    const filterTagIdInQuery =
      (router.query.filterTagId?.length ?? 0) > 0
        ? (router.query.filterTagId as string)
        : undefined
    if (filterTagIdInQuery !== pageState.filterTagId) {
      changedPageState.filterTagId = pageState.filterTagId
    }
    if (Object.keys(changedPageState).length > 0 && !router.query.objectKey) {
      void router.push({
        pathname: router.pathname,
        query: {
          folderId: folderContext.folderId,
          ...(typeof changedPageState.search === 'undefined'
            ? {}
            : { search: pageState.search }),
          ...(typeof changedPageState.filterTagId === 'undefined'
            ? {}
            : { filterTagId: pageState.filterTagId }),
        },
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    pageState,
    pageSize,
    router.pathname,
    router.query.search,
    router.query.filterTagId,
  ])

  const refreshView = React.useCallback(() => {
    if (tileContainerRef.current) {
      tileContainerRef.current.innerHTML = ''
    }
    setTimeout(handleScroll, 1)
  }, [handleScroll])

  useDebounce(
    () => {
      // console.log(
      //   'Running container resize!',
      //   tileContainerRef.current?.innerHTML,
      // )
      setIsResizing(false)
      refreshView()
    },
    200,
    [windowDimensions.innerWidth, windowDimensions.innerHeight],
  )

  const [_fetch, _cancel] = useDebounce(
    () => {
      if (!focusedObjectKey) {
        void fetchFolderObjects(objectsViewContext?.start ?? 0)
      }
    },
    100,
    [
      fetchFolderObjects,
      searchTerm,
      objectsViewContext?.start,
      objectsViewContext?.end,
    ],
  )

  // update focused object references
  React.useEffect(() => {
    if (router.query.objectKey) {
      if (
        !focusedObjectKeyRef.current ||
        focusedObjectKeyRef.current !== router.query.objectKey[0]
      ) {
        focusedObjectKeyRef.current = router.query.objectKey[0]
        setFocusedObjectKey(focusedObjectKeyRef.current)
      }
    } else if (focusedObjectKeyRef.current) {
      focusedObjectKeyRef.current = undefined
      setFocusedObjectKey(focusedObjectKeyRef.current)
      void fetchFolderObjects(0).then(() => handleScroll())
    }
  }, [router.query.objectKey, fetchFolderObjects, handleScroll])

  const startOrContinueFolderRefresh = React.useCallback(
    (_t?: string) => {
      if (folderContext.folderMetadata) {
        void apiClient.foldersApi.rescanFolder({
          folderId: folderContext.folderId,
        })
      }
    },
    [folderContext.folderId, folderContext.folderMetadata],
  )

  const handleForgetFolder = () => {
    if (!forgetFolderConfirmationOpen) {
      setForgetFolderConfirmationOpen(true)
    } else {
      setForgetFolderConfirmationOpen(false)
      void apiClient.foldersApi
        .deleteFolder({ folderId: folderContext.folderId })
        .then(() => router.push('/folders'))
    }
  }

  const handleShareClick = React.useCallback(() => {
    setShareModalOpen(true)
  }, [])

  const _handleShareClose = React.useCallback(() => {
    setShareModalOpen(false)
  }, [])

  const _handleRecalculateLocalStorage = async () => {
    await recalculateLocalStorageFolderSizes()
  }

  const _handlePurgeLocalStorage = async () => {
    await purgeLocalStorageForFolder(folderContext.folderId)
  }

  const handleRefreshFolder = React.useCallback(() => {
    if (!refreshFolderConfirmationOpen) {
      setRefreshFolderConfirmationOpen(true)
    } else {
      startOrContinueFolderRefresh(
        folderContext.folderMetadata?.indexingJobContext
          ?.indexingContinuationKey,
      )
      setRefreshFolderConfirmationOpen(false)
    }
  }, [
    startOrContinueFolderRefresh,
    refreshFolderConfirmationOpen,
    folderContext.folderMetadata?.indexingJobContext?.indexingContinuationKey,
  ])

  const handleUploadStart = React.useCallback(() => {
    setUploadOpen(true)
  }, [])

  const _handleSearchValueUpdate = (value?: string | undefined) => {
    setSearchTerm(value)
    setObjectsViewContext(undefined)
    setPageState((s) => ({ ...s, search: value }))
  }

  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (
        !focusedObjectKeyRef.current &&
        ['PageUp', 'PageDown'].includes(e.key) &&
        scrollContainerParentRef.current &&
        scrollContainerRef.current
      ) {
        scrollContainerRef.current.scroll({
          top:
            e.key === 'PageUp'
              ? scrollContainerRef.current.scrollTop -
                scrollContainerParentRef.current.clientHeight
              : scrollContainerRef.current.scrollTop +
                scrollContainerParentRef.current.clientHeight,
          behavior: 'auto',
        })
      }
    }
    document.addEventListener('keydown', handler, false)

    return () => {
      document.removeEventListener('keydown', handler, false)
    }
  })

  return (
    <>
      {uploadOpen && (
        <UploadModal
          uploadingProgress={uploadingProgress}
          onUpload={(file: File) =>
            uploadFile(folderContext.folderId, file.name, file)
          }
          onCancel={() => setUploadOpen(false)}
        />
      )}
      {forgetFolderConfirmationOpen && (
        <ConfirmForgetFolderModal
          onConfirm={() => handleForgetFolder()}
          onCancel={() => setForgetFolderConfirmationOpen(false)}
        />
      )}
      {refreshFolderConfirmationOpen && (
        <ConfirmRefreshFolderModal
          onConfirm={() => handleRefreshFolder()}
          onCancel={() => setRefreshFolderConfirmationOpen(false)}
        />
      )}
      <div
        className="relative flex flex-1 w-full h-full"
        ref={mainContainerRef}
      >
        {focusedObjectKeyRef.current && (
          <div className="absolute top-0 right-0 bottom-0 left-0 z-20">
            <FolderObjectDetailScreen
              folderId={folderContext.folderId}
              objectKey={focusedObjectKeyRef.current}
              onNextClick={
                surroundingFocusedContext &&
                surroundingFocusedContext.next > 0 &&
                surroundingFocusedContext.next <
                  (folderObjects.current.totalCount ?? 0)
                  ? () => {
                      setSurroundingFocusedContext(() => ({
                        previous: surroundingFocusedContext.previous + 1,
                        next: surroundingFocusedContext.next + 1,
                      }))
                      void router.push(
                        {
                          pathname: `/folders/${
                            folderContext.folderId
                          }/${encodeURIComponent(
                            folderObjects.current.results[
                              surroundingFocusedContext.next
                            ]?.objectKey ?? '',
                          )}`,
                        },
                        undefined,
                        { shallow: true },
                      )
                    }
                  : undefined
              }
              onPreviousClick={
                surroundingFocusedContext &&
                surroundingFocusedContext.previous >= 0
                  ? () => {
                      setSurroundingFocusedContext(() => ({
                        previous: surroundingFocusedContext.previous - 1,
                        next: surroundingFocusedContext.next - 1,
                      }))
                      void router.push(
                        {
                          pathname: `/folders/${
                            folderContext.folderId
                          }/${encodeURIComponent(
                            folderObjects.current.results[
                              surroundingFocusedContext.previous
                            ]?.objectKey ?? '',
                          )}`,
                        },
                        undefined,
                        { shallow: true },
                      )
                    }
                  : undefined
              }
              onFolderLinkClick={() => {
                void router.push(
                  { pathname: `/folders/${folderContext.folderId}` },
                  undefined,
                  { shallow: true },
                )
              }}
            />
          </div>
        )}
        <div className="flex flex-1 h-full w-full z-10">
          <div className="flex-1 flex flex-col w-full h-full ">
            <div className="px-4 py-2">
              <PageHeading
                title={folderContext.folder?.name ?? ''}
                titleIconBg={'bg-blue-100'}
                avatarKey={folderContext.folder?.id}
              >
                <div className="pt-2 flex gap-2">
                  {folderContext.folderPermissions?.includes(
                    FolderPermissionEnum.OBJECT_EDIT,
                  ) && (
                    <Button size="sm" onClick={handleUploadStart}>
                      <Icon size="sm" icon={ArrowUpOnSquareIcon} />
                      Upload
                    </Button>
                  )}
                  {folderContext.folderPermissions?.includes(
                    FolderPermissionEnum.FOLDER_RESCAN,
                  ) && (
                    <Button size="sm" onClick={handleRefreshFolder}>
                      <Icon size="sm" icon={ArrowPathIcon} />
                      Refresh
                    </Button>
                  )}
                  {folderContext.folderPermissions?.includes(
                    FolderPermissionEnum.FOLDER_FORGET,
                  ) && (
                    <Button size="sm" onClick={handleForgetFolder}>
                      <Icon size="sm" icon={TrashIcon} />
                    </Button>
                  )}
                  {/* {folderContext.folderPermissions?.includes(
                    FolderPermissionsEnum.FolderManageShares,
                  ) && (
                    <Button primary size="sm" onClick={handleShareClick}>
                      <Icon size="sm" className="text-white" icon={UsersIcon} />
                      Share
                    </Button>
                  )} */}
                </div>
              </PageHeading>
            </div>
            <div className="flex flex-1 overflow-hidden">
              <div className="flex-1 flex overflow-hidden">
                <div
                  ref={scrollContainerParentRef}
                  className="flex-1 h-full overflow-hidden"
                >
                  {folderContext.folderMetadata?.totalCount === 0 ? (
                    <div className="h-full w-full flex flex-col justify-around">
                      <FolderEmptyState onRefresh={handleRefreshFolder} />
                    </div>
                  ) : (
                    <div
                      ref={scrollContainerRef}
                      className="overflow-y-auto h-full flex-1 -mr-[20px]"
                      onScroll={handleScroll}
                    >
                      <div
                        ref={tileContainerRef}
                        className="justify-left ml-[4px] flex flex-wrap content-start overflow-hidden"
                        style={{
                          height: `${INITIAL_SCROLL_HEIGHT}px`,
                        }}
                      ></div>
                    </div>
                  )}
                </div>
                <div
                  className={clsx(
                    'flex',
                    folderContext.folderMetadata?.totalCount === 0
                      ? 'opacity-0'
                      : 'opacity-100',
                  )}
                >
                  <FolderScroll
                    viewHeight={
                      (objectsViewContext?.scrollViewHeight ?? 0) * 100
                    }
                    marginTop={
                      (scrollContainerParentRef.current?.clientHeight ?? 0) *
                      ((objectsViewContext?.scrollTopPercentage ?? 0) -
                        (objectsViewContext?.scrollTopPercentage ?? 0) *
                          (objectsViewContext?.scrollViewHeight ?? 0))
                    }
                  />
                </div>
              </div>
              {sidebarOpen &&
                folderContext.folder &&
                folderContext.folderPermissions && (
                  <div className="xs:w-[100%] md:w-[50%] lg:w-[50%] xl:w-[40%] 2xl:w-[35%] 2xl:max-w-[35rem]">
                    <FolderSidebar
                      onRescan={() => setRefreshFolderConfirmationOpen(true)}
                      onIndexAll={handleIndexAll}
                      activeTab={sidebarTab}
                      onTabChange={(t) => setSidebarTab(t)}
                      folderMetadata={folderContext.folderMetadata}
                      folderAndPermission={{
                        folder: folderContext.folder,
                        permissions: folderContext.folderPermissions,
                      }}
                    />
                  </div>
                )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
