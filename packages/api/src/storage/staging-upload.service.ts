import { SignedURLsRequestMethod } from '@lombokapp/types'
import { BadRequestException, Inject, Injectable } from '@nestjs/common'
import nestjsConfig from '@nestjs/config'
import crypto from 'crypto'
import { coreConfig } from 'src/core/config'
import { StorageProvisionService } from 'src/server/services/storage-provision.service'

import { S3Service } from './s3.service'
import { requireServerStorage } from './server-storage.util'
import type { StagingPurpose } from './staging-upload.constants'
import { STAGING_PURPOSE_TIER_MB } from './staging-upload.constants'

export interface StagedFile {
  buffer: Buffer
  mimetype: string
  size: number
}

/**
 * A user-scoped staging area in the dedicated `uploads` system bucket. The
 * client uploads bytes via a presigned PUT, then references the returned
 * `stagingKey` in a follow-up create/update request; the backend fetches the
 * bytes (`fetchStagedUpload`), processes them, and removes the staged object
 * (`deleteStagedUpload`) only once everything downstream has succeeded. Keys are
 * scoped by user id so one user cannot consume another's staged upload.
 */
@Injectable()
export class StagingUploadService {
  constructor(
    private readonly storageProvisionService: StorageProvisionService,
    private readonly s3Service: S3Service,
    @Inject(coreConfig.KEY)
    private readonly _coreConfig: nestjsConfig.ConfigType<typeof coreConfig>,
  ) {}

  private buildKey(
    purpose: StagingPurpose,
    userId: string,
    stagingKey: string,
  ): string {
    // {tierMb}/{userId}/{uuid} in the dedicated uploads bucket — the leading
    // integer tier segment is what nginx caps (path `/uploads/{tier}/...`).
    return [String(STAGING_PURPOSE_TIER_MB[purpose]), userId, stagingKey].join(
      '/',
    )
  }

  async createStagingUpload(
    userId: string,
    purpose: StagingPurpose,
  ): Promise<{ stagingKey: string; uploadUrl: string }> {
    const serverStorage = await requireServerStorage(
      this.storageProvisionService,
    )
    const stagingKey = crypto.randomUUID()
    const [uploadUrl] = this.s3Service.createS3PresignedUrls([
      {
        accessKeyId: serverStorage.accessKeyId,
        secretAccessKey: serverStorage.secretAccessKey,
        region: serverStorage.region,
        endpoint: serverStorage.endpoint,
        bucket: this._coreConfig.s3SystemBuckets.uploads,
        objectKey: this.buildKey(purpose, userId, stagingKey),
        method: SignedURLsRequestMethod.PUT,
        expirySeconds: 300,
      },
    ])
    if (!uploadUrl) {
      throw new Error('Failed to generate staging upload URL')
    }
    return { stagingKey, uploadUrl }
  }

  private async resolveS3Object(
    userId: string,
    stagingKey: string,
    purpose: StagingPurpose,
  ) {
    const serverStorage = await requireServerStorage(
      this.storageProvisionService,
    )
    return {
      accessKeyId: serverStorage.accessKeyId,
      secretAccessKey: serverStorage.secretAccessKey,
      region: serverStorage.region,
      endpoint: serverStorage.endpoint,
      bucket: this._coreConfig.s3SystemBuckets.uploads,
      objectKey: this.buildKey(purpose, userId, stagingKey),
    }
  }

  /**
   * Fetch the staged bytes for `stagingKey` (scoped to `userId` and `purpose`)
   * WITHOUT removing the object — call `deleteStagedUpload` only after the
   * consuming create/update has committed, so a downstream failure leaves the
   * staged bytes retriable. The `purpose` fixes which size tier is read, so the
   * consuming feature (not the client) decides the size ceiling. Throws if the
   * upload is missing or exceeds the tier's limit.
   */
  async fetchStagedUpload(
    userId: string,
    stagingKey: string,
    purpose: StagingPurpose,
  ): Promise<StagedFile> {
    const s3Object = await this.resolveS3Object(userId, stagingKey, purpose)
    const response = await this.s3Service.s3GetBucketObject(s3Object)
    if (!response.ok) {
      throw new BadRequestException('Staged upload not found or expired')
    }
    const buffer = Buffer.from(await response.arrayBuffer())
    // Authoritative size check (nginx caps it at the edge, but uploads that
    // bypass nginx — e.g. dev/e2e direct-to-Garage — are enforced here). Tier 0
    // means unlimited.
    const tierMb: number = STAGING_PURPOSE_TIER_MB[purpose]
    if (tierMb !== 0 && buffer.length > tierMb * 1024 * 1024) {
      throw new BadRequestException('Staged upload exceeds the size limit')
    }
    const mimetype =
      response.headers.get('content-type') ?? 'application/octet-stream'

    return { buffer, mimetype, size: buffer.length }
  }

  /** Remove a staged object once it has been successfully consumed. */
  async deleteStagedUpload(
    userId: string,
    stagingKey: string,
    purpose: StagingPurpose,
  ): Promise<void> {
    const s3Object = await this.resolveS3Object(userId, stagingKey, purpose)
    await this.s3Service.s3DeleteBucketObject(s3Object).catch(() => undefined)
  }
}
