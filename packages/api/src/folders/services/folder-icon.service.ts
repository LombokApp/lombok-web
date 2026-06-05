import { FolderPermissionEnum, SignedURLsRequestMethod } from '@lombokapp/types'
import {
  Injectable,
  NotFoundException,
  NotImplementedException,
} from '@nestjs/common'
import { eq } from 'drizzle-orm'
import { OrmService } from 'src/orm/orm.service'
import { ServerConfigurationService } from 'src/server/services/server-configuration.service'
import {
  cropAndResizeImage,
  IMAGE_SIZES,
  ImageSize,
  validateImageUpload,
} from 'src/shared/utils'
import { S3Service } from 'src/storage/s3.service'
import type { User } from 'src/users/entities/user.entity'

import { foldersTable } from '../entities/folder.entity'
import { FolderOperationForbiddenException } from '../exceptions/folder-operation-forbidden.exception'
import { FolderService } from './folder.service'

interface ServerStorage {
  accessKeyId: string
  secretAccessKey: string
  endpoint: string
  bucket: string
  region: string
  prefix: string | null
}

function buildIconKey(
  serverStorage: ServerStorage,
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
    private readonly serverConfigurationService: ServerConfigurationService,
    private readonly s3Service: S3Service,
  ) {}

  private async requireServerStorage(): Promise<ServerStorage> {
    const serverStorage =
      await this.serverConfigurationService.getServerStorage()
    if (!serverStorage) {
      throw new NotImplementedException('Server storage not configured')
    }
    return serverStorage
  }

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

    await validateImageUpload(file)
    const serverStorage = await this.requireServerStorage()
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
    await this.ormService.db
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
    const serverStorage = await this.requireServerStorage()
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
    const serverStorage = await this.requireServerStorage()
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
