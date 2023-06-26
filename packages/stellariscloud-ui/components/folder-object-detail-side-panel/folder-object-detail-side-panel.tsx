import {
  ArrowDownTrayIcon,
  ArrowPathIcon,
  TrashIcon,
} from '@heroicons/react/24/outline'
import type {
  FolderAndPermission,
  FolderObjectContentMetadata,
  FolderObjectData,
  ObjectTagData,
} from '@stellariscloud/api-client'
import { FolderPermissionName } from '@stellariscloud/api-client'
import { Button, Icon } from '@stellariscloud/design-system'
import clsx from 'clsx'
import React from 'react'

import { formatBytes } from '../../utils/size-format'
import { ManageObjectTagsForm } from '../manage-objects-tag-form/manage-objects-tag-form'

export const FolderObjectDetailSidePanel = ({
  fileObject,
  objectKey,
  folderAndPermission,
  onFolderRefresh,
  onDelete,
  fileObjectMetadata,
  onDownload,
  previews = {},
  displaySize,
  objectTags,
  tags,
  onDisplaySizeChange,
  onTagObject,
  onUntagObject,
  onCreateTag,
}: {
  fileObject?: FolderObjectData
  objectKey: string
  folderAndPermission?: FolderAndPermission
  className?: string
  fileObjectMetadata?: FolderObjectContentMetadata
  onFolderRefresh?: () => void
  onDelete?: () => void
  onShare?: () => void
  onCreateTag: (tagName: string) => Promise<ObjectTagData>
  onTagObject: (tagId: string) => Promise<void>
  onUntagObject: (tagId: string) => Promise<void>
  onDisplaySizeChange?: (displaySize: string) => void
  displaySize: string
  onDownload?: () => void
  onEdit?: () => void
  objectTags?: ObjectTagData[]
  tags?: ObjectTagData[]
  previews?: FolderObjectContentMetadata['previews']
}) => {
  const previewSizes = ['original', ...Object.keys(previews)]

  const filename = objectKey.split('/').at(-1)
  return (
    <div className="flex flex-col h-full gap-4 p-4 bg-gray-800 text-white">
      <div className="flex flex-col">
        <div className="opacity-50">
          {filename === objectKey ? 'Key / Filename' : 'Key'}
        </div>
        <div>{objectKey}</div>
      </div>
      {filename !== objectKey && (
        <div className="flex flex-col">
          <div className="opacity-50">Filename</div>
          <div>{filename}</div>
        </div>
      )}
      <div className="flex flex-col">
        <div className="opacity-50">Bucket endpoint</div>
        <div>{folderAndPermission?.folder.endpoint}</div>
      </div>
      <div className="flex flex-col">
        <div className="opacity-50">Bucket</div>
        <div>{folderAndPermission?.folder.bucket}</div>
      </div>
      {folderAndPermission?.permissions.includes(
        FolderPermissionName.ObjectManage,
      ) && (
        <div className="flex flex-col gap-2">
          <div className="opacity-50">Tags</div>
          <ManageObjectTagsForm
            tags={tags ?? []}
            objectTags={objectTags ?? []}
            onCreateTag={onCreateTag}
            onTagObject={onTagObject}
            onUntagObject={onUntagObject}
          />
        </div>
      )}
      <div className="flex flex-col">
        <div className="opacity-50">Created</div>
        <div>
          {fileObject?.lastModified && (
            <span className="opacity-80">
              {new Date(fileObject.lastModified * 1000).toUTCString()}
            </span>
          )}
        </div>
      </div>
      <div className="flex flex-col">
        <div className="opacity-50">Type</div>
        <span className="opacity-80 font-mono">
          {fileObjectMetadata?.mimeType}
        </span>
      </div>
      <div className="flex flex-col">
        <div className="opacity-50">Size</div>
        <span className="opacity-80 font-mono">
          {fileObject?.sizeBytes
            ? formatBytes(fileObject.sizeBytes)
            : undefined}
        </span>
      </div>
      <div className="flex flex-col">
        <div className="opacity-50">Hash</div>
        <span className="opacity-80 font-mono">{fileObjectMetadata?.hash}</span>
      </div>
      <div className="flex flex-col">
        <div className="opacity-50">Actions</div>
        <div className="pt-2 flex gap-2">
          {folderAndPermission?.permissions.includes(
            FolderPermissionName.ObjectManage,
          ) && (
            <Button
              preventDefaultOnClick
              variant="primary"
              size="sm"
              onClick={onFolderRefresh}
            >
              <Icon icon={ArrowPathIcon} size="sm" />
              Reindex
            </Button>
          )}
          {onDelete &&
            folderAndPermission?.permissions.includes(
              FolderPermissionName.ObjectEdit,
            ) && (
              <Button
                preventDefaultOnClick
                variant="primary"
                size="sm"
                onClick={onDelete}
              >
                <Icon icon={TrashIcon} size="sm" />
                Delete
              </Button>
            )}
          {onDownload && (
            <Button
              preventDefaultOnClick
              variant="primary"
              size="sm"
              onClick={onDownload}
            >
              <Icon icon={ArrowDownTrayIcon} size="sm" />
              Download
            </Button>
          )}
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <div className="opacity-50">Display size</div>
        <div className="flex flex-wrap gap-2">
          {previewSizes.map((previewSize) => (
            <Button
              variant="primary"
              key={previewSize}
              className={clsx(previewSize === displaySize && 'btn-active')}
              onClick={() => onDisplaySizeChange?.(previewSize)}
            >
              {previewSize}
            </Button>
          ))}
        </div>
      </div>
      <div className="text-xs">
        <pre>{JSON.stringify(fileObjectMetadata, null, 2)}</pre>
      </div>
    </div>
  )
}
