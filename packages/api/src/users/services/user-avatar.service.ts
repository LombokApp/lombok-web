import {
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

import { usersTable } from '../entities/user.entity'

function buildAvatarKey(
  serverStorage: ServerStorageWithSecret,
  userId: string,
  size: ImageSize,
): string {
  const parts: string[] = []
  const trimmedPrefix = serverStorage.prefix?.replace(/\/+$/, '') ?? ''
  if (trimmedPrefix) {
    parts.push(trimmedPrefix)
  }
  parts.push('avatars', 'users', userId, `${size}.webp`)
  return parts.join('/')
}

@Injectable()
export class UserAvatarService {
  constructor(
    private readonly ormService: OrmService,
    private readonly storageProvisionService: StorageProvisionService,
    private readonly s3Service: S3Service,
  ) {}

  async setAvatar(
    userId: string,
    file: { mimetype: string; size: number; buffer: Buffer },
    tx?: OrmService['db'],
  ): Promise<Date> {
    await validateImageUpload(file)
    const serverStorage = await requireServerStorage(
      this.storageProvisionService,
    )
    const resized = await cropAndResizeImage(file.buffer)

    const uploads = IMAGE_SIZES.map(async (size) => {
      const objectKey = buildAvatarKey(serverStorage, userId, size)
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
        body: new Blob([new Uint8Array(resized[size])], { type: 'image/webp' }),
      })
      if (!response.ok) {
        throw new Error(
          `Failed to upload avatar size ${size}: HTTP ${response.status}`,
        )
      }
    })

    await Promise.all(uploads)

    const now = new Date()
    await (tx ?? this.ormService.db)
      .update(usersTable)
      .set({ avatarUpdatedAt: now, updatedAt: now })
      .where(eq(usersTable.id, userId))
    return now
  }

  async deleteAvatar(userId: string): Promise<void> {
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
          objectKey: buildAvatarKey(serverStorage, userId, size),
        }),
      ),
    )
    const now = new Date()
    await this.ormService.db
      .update(usersTable)
      .set({ avatarUpdatedAt: null, updatedAt: now })
      .where(eq(usersTable.id, userId))
  }

  async resolveAvatarUrl(userId: string, size: ImageSize): Promise<string> {
    const user = await this.ormService.db.query.usersTable.findFirst({
      where: eq(usersTable.id, userId),
    })
    if (!user?.avatarUpdatedAt) {
      throw new NotFoundException('Avatar not set')
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
        objectKey: buildAvatarKey(serverStorage, userId, size),
        method: SignedURLsRequestMethod.GET,
        expirySeconds: 3600,
      },
    ])
    if (!url) {
      throw new NotFoundException('Avatar not available')
    }
    return url
  }
}
