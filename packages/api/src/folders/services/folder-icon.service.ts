import {
  FolderPermissionEnum,
  ServerStorageWithSecret,
  SignedURLsRequestMethod,
} from '@lombokapp/types'
import { Injectable, NotFoundException } from '@nestjs/common'
import { eq } from 'drizzle-orm'
import { OrmService } from 'src/orm/orm.service'
import { StorageProvisionService } from 'src/server/services/storage-provision.service'
import {
  cropAndResizeImage,
  IMAGE_SIZES,
  ImageSize,
  validateImageUpload,
} from 'src/shared/utils'
import { S3Service } from 'src/storage/s3.service'
import { requireServerStorage } from 'src/storage/server-storage.util'
import type { User } from 'src/users/entities/user.entity'

import { foldersTable } from '../entities/folder.entity'
import { FolderOperationForbiddenException } from '../exceptions/folder-operation-forbidden.exception'
import { FolderService } from './folder.service'

function buildIconKey(
  serverStorage: ServerStorageWithSecret,
  folderId: string,
  size: ImageSize,
): string {
  const parts: string[] = []
  const trimmedPrefix = serverStorage.prefix?.replace(/\/+$/, '') ?? ''
  if (trimmedPrefix) {
    parts.push(trimmedPrefix)
  }
  parts.push('icons', 'folders', folderId, `${size}.webp`)
  return parts.join('/')
}

@Injectable()
export class FolderIconService {
  constructor(
    private readonly ormService: OrmService,
    private readonly folderService: FolderService,
    private readonly storageProvisionService: StorageProvisionService,
    private readonly s3Service: S3Service,
  ) {}

  /**
   * Set a folder icon on behalf of `actor` — checks edit permission, then
   * applies. Used by the standalone set-icon endpoint on an existing folder.
   */
  async setIcon(
    actor: User,
    folderId: string,
    file: { mimetype: string; size: number; buffer: Buffer },
  ): Promise<Date> {
    const { permissions } = await this.folderService.getFolderAsUser(
      actor,
      folderId,
    )
    if (!permissions.includes(FolderPermissionEnum.FOLDER_EDIT)) {
      throw new FolderOperationForbiddenException()
    }
    return this.applyIcon(folderId, file)
  }

  /**
   * Resize + upload the icon assets and stamp `iconUpdatedAt`. No permission
   * check — the folder-create path calls this inside its transaction (the actor
   * owns the just-inserted folder, and a re-read would not see the uncommitted
   * row). `tx` threads the create transaction so a failure here rolls the folder
   * back. Note: the S3 PUTs are not transactional, so a rollback can leave
   * orphaned (reapable) icon objects.
   */
  async applyIcon(
    folderId: string,
    file: { mimetype: string; size: number; buffer: Buffer },
    tx?: OrmService['db'],
  ): Promise<Date> {
    await validateImageUpload(file)
    const serverStorage = await requireServerStorage(
      this.storageProvisionService,
    )
    const resized = await cropAndResizeImage(file.buffer)

    await Promise.all(
      IMAGE_SIZES.map(async (size) => {
        const objectKey = buildIconKey(serverStorage, folderId, size)
        const [url] = this.s3Service.createS3PresignedUrls([
          {
            accessKeyId: serverStorage.accessKeyId,
            secretAccessKey: serverStorage.secretAccessKey,
            region: serverStorage.region,
            endpoint: serverStorage.endpoint,
            bucket: serverStorage.bucket,
            objectKey,
            method: SignedURLsRequestMethod.PUT,
            expirySeconds: 300,
          },
        ])
        if (!url) {
          throw new Error('Failed to generate upload URL')
        }
        const response = await fetch(url, {
          method: 'PUT',
          headers: { 'Content-Type': 'image/webp' },
          body: new Blob([new Uint8Array(resized[size])], {
            type: 'image/webp',
          }),
        })
        if (!response.ok) {
          throw new Error(
            `Failed to upload folder icon size ${size}: HTTP ${response.status}`,
          )
        }
      }),
    )

    const now = new Date()
    await (tx ?? this.ormService.db)
      .update(foldersTable)
      .set({ iconUpdatedAt: now, updatedAt: now })
      .where(eq(foldersTable.id, folderId))
    return now
  }

  async deleteIcon(actor: User, folderId: string): Promise<void> {
    const { permissions } = await this.folderService.getFolderAsUser(
      actor,
      folderId,
    )
    if (!permissions.includes(FolderPermissionEnum.FOLDER_EDIT)) {
      throw new FolderOperationForbiddenException()
    }
    const serverStorage = await requireServerStorage(
      this.storageProvisionService,
    )
    await Promise.all(
      IMAGE_SIZES.map((size) =>
        this.s3Service.s3DeleteBucketObject({
          accessKeyId: serverStorage.accessKeyId,
          secretAccessKey: serverStorage.secretAccessKey,
          region: serverStorage.region,
          endpoint: serverStorage.endpoint,
          bucket: serverStorage.bucket,
          objectKey: buildIconKey(serverStorage, folderId, size),
        }),
      ),
    )
    const now = new Date()
    await this.ormService.db
      .update(foldersTable)
      .set({ iconUpdatedAt: null, updatedAt: now })
      .where(eq(foldersTable.id, folderId))
  }

  async resolveIconUrl(folderId: string, size: ImageSize): Promise<string> {
    const folder = await this.ormService.db.query.foldersTable.findFirst({
      where: eq(foldersTable.id, folderId),
    })
    if (!folder?.iconUpdatedAt) {
      throw new NotFoundException('Icon not set')
    }
    const serverStorage = await requireServerStorage(
      this.storageProvisionService,
    )
    const [url] = this.s3Service.createS3PresignedUrls([
      {
        accessKeyId: serverStorage.accessKeyId,
        secretAccessKey: serverStorage.secretAccessKey,
        region: serverStorage.region,
        endpoint: serverStorage.endpoint,
        bucket: serverStorage.bucket,
        objectKey: buildIconKey(serverStorage, folderId, size),
        method: SignedURLsRequestMethod.GET,
        expirySeconds: 3600,
      },
    ])
    if (!url) {
      throw new NotFoundException('Icon not available')
    }
    return url
  }
}
