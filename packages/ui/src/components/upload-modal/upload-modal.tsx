'use client'

import {
  Button,
  cn,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@stellariscloud/ui-toolkit'
import React from 'react'
import type { FileRejection } from 'react-dropzone'

import { FolderUploadDropzone } from '../../views/folder-upload-dropzone/folder-upload-dropzone.view'
import { ProgressBar } from '../progress-bar/progress-bar'

export interface UploadModalData {
  isOpen: boolean
  uploadingProgress: Record<string, number | undefined>
}

const UploadModal = ({
  modalData,
  setModalData,
  onUpload,
}: {
  modalData: UploadModalData
  setModalData: (modalData: UploadModalData) => void
  onUpload: (file: File) => void
}) => {
  const [uploadingFiles, setUploadingFiles] = React.useState<File[]>([])

  const onDrop = React.useCallback(
    (acceptedFiles: File[], _fileRejections: FileRejection[]) => {
      setUploadingFiles((_uploadingFiles) =>
        _uploadingFiles.concat(acceptedFiles),
      )
      for (const f of acceptedFiles) {
        onUpload(f)
      }
    },
    [onUpload],
  )

  return (
    <Dialog
      open={!!modalData.isOpen}
      onOpenChange={(isNowOpen) =>
        setModalData({ ...modalData, isOpen: isNowOpen })
      }
    >
      <DialogContent
        className="top-0 mt-[50%] rounded-none border-0 sm:top-1/2 sm:mt-0 [&_svg]:size-6"
        aria-describedby={undefined}
      >
        <DialogHeader className="text-left">
          <DialogTitle>Reindex folder</DialogTitle>
        </DialogHeader>
        <DialogDescription>Drop files to upload them.</DialogDescription>
        <div className={cn('flex w-full justify-between gap-4 rounded-md')}>
          <FolderUploadDropzone onDrop={onDrop} />
          {uploadingFiles.length > 0 && (
            <div className="flex flex-col gap-2">
              {uploadingFiles.map((uploadingFile, i) => (
                <div key={`${uploadingFile.name}_${i}`}>
                  {uploadingFile.name}
                  <ProgressBar
                    progress={
                      modalData.uploadingProgress[uploadingFile.name] ?? 0
                    }
                  />
                </div>
              ))}
            </div>
          )}
        </div>
        <DialogFooter>
          <div className="flex gap-4">
            <Button
              onClick={() => setModalData({ ...modalData, isOpen: false })}
            >
              Done
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export { UploadModal }
