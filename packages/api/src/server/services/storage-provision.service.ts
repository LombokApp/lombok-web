import {
  ServerStorageWithSecret,
  StorageProvisionType,
  StorageProvisionTypeEnum,
  StorageProvisionTypeZodEnum,
  StorageProvisionWithSecret,
} from '@lombokapp/types'
import {
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common'
import nestjsConfig from '@nestjs/config'
import crypto from 'crypto'
import { eq } from 'drizzle-orm'
import { coreConfig } from 'src/core/config'
import { OrmService } from 'src/orm/orm.service'
import { buildAccessKeyHashId } from 'src/storage/access-key.utils'
import { buildEmbeddedServerStorage } from 'src/storage/embedded-s3'
import type { ExternalStorageProvision } from 'src/storage/entities/external-storage-provision.entity'
import { externalStorageProvisionsTable } from 'src/storage/entities/external-storage-provision.entity'
import type { User } from 'src/users/entities/user.entity'
import { z } from 'zod'

import {
  StorageProvisionInputDTO,
  StorageProvisionUpdateDTO,
} from '../dto/storage-provision-input.dto'
import { ServerConfigurationInvalidException } from '../exceptions/server-configuration-invalid.exception'
import { ServerConfigurationNotFoundException } from '../exceptions/server-configuration-not-found.exception'

/** Map an External provision row to the in-memory provision-with-secret shape. */
function externalProvisionRowToProvision(
  row: ExternalStorageProvision,
): StorageProvisionWithSecret {
  return {
    id: row.id,
    label: row.label,
    description: row.description,
    endpoint: row.endpoint,
    bucket: row.bucket,
    region: row.region,
    accessKeyId: row.accessKeyId,
    secretAccessKey: row.secretAccessKey,
    accessKeyHashId: row.accessKeyHashId,
    prefix: row.prefix,
    provisionTypes: row.provisionTypes,
  }
}

@Injectable()
export class StorageProvisionService {
  constructor(
    private readonly ormService: OrmService,
    @Inject(coreConfig.KEY)
    private readonly _coreConfig: nestjsConfig.ConfigType<typeof coreConfig>,
  ) {}

  async createStorageProvisionAsAdmin(
    actor: User,
    storageProvision: StorageProvisionInputDTO,
  ) {
    if (!actor.isAdmin) {
      throw new UnauthorizedException()
    }
    const now = new Date()

    for (const provisionType of storageProvision.provisionTypes) {
      if (
        z.enum(StorageProvisionTypeEnum).parse(provisionType) !== provisionType
      ) {
        throw new ServerConfigurationInvalidException()
      }
    }

    const locationWithId = {
      ...storageProvision,
      id: crypto.randomUUID(),
      prefix: storageProvision.prefix ?? null,
      accessKeyHashId: buildAccessKeyHashId({
        accessKeyId: storageProvision.accessKeyId,
        secretAccessKey: storageProvision.secretAccessKey,
        region: storageProvision.region,
        endpoint: storageProvision.endpoint,
      }),
    }

    await this.ormService.db.insert(externalStorageProvisionsTable).values({
      ...locationWithId,
      createdAt: now,
      updatedAt: now,
    })

    return locationWithId
  }

  async updateStorageProvisionAsAdmin(
    actor: User,
    storageProvisionId: string,
    storageProvision: StorageProvisionInputDTO | StorageProvisionUpdateDTO,
  ) {
    const now = new Date()
    if (!actor.isAdmin) {
      throw new UnauthorizedException()
    }

    if (storageProvision.provisionTypes) {
      for (const provisionType of storageProvision.provisionTypes) {
        if (
          z.enum(StorageProvisionTypeEnum).parse(provisionType) !==
          provisionType
        ) {
          throw new ServerConfigurationInvalidException()
        }
      }
    }

    const existingLocation =
      await this.ormService.db.query.externalStorageProvisionsTable.findFirst({
        where: eq(externalStorageProvisionsTable.id, storageProvisionId),
      })
    if (!existingLocation) {
      throw new NotFoundException()
    }

    // Merge partial updates (credentials are immutable here — rotated separately)
    // and recompute the access-key hash id from the existing credentials.
    const merged: ExternalStorageProvision = {
      ...existingLocation,
      ...storageProvision,
      accessKeyId: existingLocation.accessKeyId,
      secretAccessKey: existingLocation.secretAccessKey,
    }
    const accessKeyHashId = buildAccessKeyHashId({
      accessKeyId: merged.accessKeyId,
      secretAccessKey: merged.secretAccessKey,
      region: merged.region,
      endpoint: merged.endpoint,
    })

    await this.ormService.db
      .update(externalStorageProvisionsTable)
      .set({ ...merged, accessKeyHashId, updatedAt: now })
      .where(eq(externalStorageProvisionsTable.id, storageProvisionId))
  }

  async deleteStorageProvisionAsAdmin(actor: User, storageProvisionId: string) {
    if (!actor.isAdmin) {
      throw new UnauthorizedException()
    }

    const deleted = await this.ormService.db
      .delete(externalStorageProvisionsTable)
      .where(eq(externalStorageProvisionsTable.id, storageProvisionId))
      .returning()

    if (deleted.length === 0) {
      throw new ServerConfigurationNotFoundException()
    }

    return deleted
  }

  async getStorageProvisionById(
    storageProvisionId: string,
  ): Promise<StorageProvisionWithSecret | undefined> {
    const row =
      await this.ormService.db.query.externalStorageProvisionsTable.findFirst({
        where: eq(externalStorageProvisionsTable.id, storageProvisionId),
      })

    return row ? externalProvisionRowToProvision(row) : undefined
  }

  async listExternalStorageProvisionsAsUser(
    actor: User,
    { provisionType }: { provisionType?: StorageProvisionType } = {},
  ): Promise<StorageProvisionWithSecret[]> {
    if (
      provisionType &&
      StorageProvisionTypeZodEnum.parse(provisionType) !== provisionType
    ) {
      throw new ServerConfigurationInvalidException()
    }

    const externalRows =
      await this.ormService.db.query.externalStorageProvisionsTable.findMany()

    const all = externalRows.map(externalProvisionRowToProvision)

    return provisionType
      ? all.filter((r) => r.provisionTypes.includes(provisionType))
      : all
  }

  // Server storage is always the embedded S3 service, in its dedicated bucket.
  // Returns a resolved Promise (no DB round trip) so the many `await` call sites
  // stay unchanged.
  getServerStorage(): Promise<ServerStorageWithSecret | undefined> {
    return Promise.resolve(
      buildEmbeddedServerStorage(
        this._coreConfig.s3SystemBuckets.serverStorage,
      ),
    )
  }
}
