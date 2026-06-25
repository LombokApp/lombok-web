import { SignedURLsRequestMethod } from '@lombokapp/types'
import {
  Injectable,
  NotFoundException,
  NotImplementedException,
} from '@nestjs/common'
import { eq } from 'drizzle-orm'
import { OrmService } from 'src/orm/orm.service'
import {
  cropAndResizeImage,
  IMAGE_SIZES,
  ImageSize,
  validateImageUpload,
} from 'src/shared/utils'
import { S3Service } from 'src/storage/s3.service'

import { SERVER_ICON_CONFIG } from '../constants/server.constants'
import { serverSettingsTable } from '../entities/server-configuration.entity'
import { StorageProvisionService } from './storage-provision.service'

interface ServerStorage {
  accessKeyId: string
  secretAccessKey: string
  endpoint: string
  bucket: string
  region: string
  prefix: string | null
}

function buildServerIconKey(
  serverStorage: ServerStorage,
  size: ImageSize,
): string {
  const parts: string[] = []
  const trimmedPrefix = serverStorage.prefix?.replace(/\/+$/, '') ?? ''
  if (trimmedPrefix) {
    parts.push(trimmedPrefix)
  }
  parts.push('icons', 'server', `${size}.webp`)
  return parts.join('/')
}

@Injectable()
export class ServerIconService {
  constructor(
    private readonly ormService: OrmService,
    private readonly storageProvisionService: StorageProvisionService,
    private readonly s3Service: S3Service,
  ) {}

  private async requireServerStorage(): Promise<ServerStorage> {
    const serverStorage = await this.storageProvisionService.getServerStorage()
    if (!serverStorage) {
      throw new NotImplementedException('Server storage not configured')
    }
    return serverStorage
  }

  async getIconUpdatedAt(): Promise<Date | null> {
    const row = await this.ormService.db.query.serverSettingsTable.findFirst({
      where: eq(serverSettingsTable.key, SERVER_ICON_CONFIG.key),
    })
    if (!row) {
      return null
    }
    const value = row.value as { updatedAt?: string } | null
    if (!value?.updatedAt) {
      return null
    }
    return new Date(value.updatedAt)
  }

  async setIcon(file: {
    mimetype: string
    size: number
    buffer: Buffer
  }): Promise<Date> {
    await validateImageUpload(file)
    const serverStorage = await this.requireServerStorage()
    const resized = await cropAndResizeImage(file.buffer)

    await Promise.all(
      IMAGE_SIZES.map(async (size) => {
        const objectKey = buildServerIconKey(serverStorage, size)
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
            `Failed to upload server icon size ${size}: HTTP ${response.status}`,
          )
        }
      }),
    )

    const now = new Date()
    const value = { updatedAt: now.toISOString() }
    const existing =
      await this.ormService.db.query.serverSettingsTable.findFirst({
        where: eq(serverSettingsTable.key, SERVER_ICON_CONFIG.key),
      })
    if (existing) {
      await this.ormService.db
        .update(serverSettingsTable)
        .set({ value, updatedAt: now })
        .where(eq(serverSettingsTable.key, SERVER_ICON_CONFIG.key))
    } else {
      await this.ormService.db.insert(serverSettingsTable).values({
        key: SERVER_ICON_CONFIG.key,
        value,
        createdAt: now,
        updatedAt: now,
      })
    }
    return now
  }

  async deleteIcon(): Promise<void> {
    const serverStorage = await this.requireServerStorage()
    await Promise.all(
      IMAGE_SIZES.map((size) =>
        this.s3Service.s3DeleteBucketObject({
          accessKeyId: serverStorage.accessKeyId,
          secretAccessKey: serverStorage.secretAccessKey,
          region: serverStorage.region,
          endpoint: serverStorage.endpoint,
          bucket: serverStorage.bucket,
          objectKey: buildServerIconKey(serverStorage, size),
        }),
      ),
    )
    await this.ormService.db
      .delete(serverSettingsTable)
      .where(eq(serverSettingsTable.key, SERVER_ICON_CONFIG.key))
  }

  async resolveIconUrl(size: ImageSize): Promise<string> {
    const updatedAt = await this.getIconUpdatedAt()
    if (!updatedAt) {
      throw new NotFoundException('Server icon not set')
    }
    const serverStorage = await this.requireServerStorage()
    const [url] = this.s3Service.createS3PresignedUrls([
      {
        accessKeyId: serverStorage.accessKeyId,
        secretAccessKey: serverStorage.secretAccessKey,
        region: serverStorage.region,
        endpoint: serverStorage.endpoint,
        bucket: serverStorage.bucket,
        objectKey: buildServerIconKey(serverStorage, size),
        method: SignedURLsRequestMethod.GET,
        expirySeconds: 3600,
      },
    ])
    if (!url) {
      throw new NotFoundException('Server icon not available')
    }
    return url
  }
}
