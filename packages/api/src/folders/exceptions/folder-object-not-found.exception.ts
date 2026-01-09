import { NotFoundException } from '@nestjs/common'
import { ServiceErrorKey } from 'src/core/constants/service-error-key.constants'

export class FolderObjectNotFoundException extends NotFoundException {
  name = FolderObjectNotFoundException.name
  serviceErrorKey = ServiceErrorKey.FolderObjectNotFound
  constructor(folderId: string, objectKey: string) {
    super(
      `Folder object not found: folderId=${folderId}, objectKey=${objectKey}`,
    )
  }
}
