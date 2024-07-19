import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common'
import {
  StorageProvisionType,
  StorageProvisionTypeEnum,
  StorageProvisionTypeZodEnum,
} from '@stellariscloud/types'
import { eq, inArray } from 'drizzle-orm'
import { OrmService } from 'src/orm/orm.service'
import type { User } from 'src/users/entities/user.entity'
import { v4 as uuidV4 } from 'uuid'
import { z } from 'zod'

import {
  CONFIGURATION_KEYS,
  STORAGE_PROVISIONS_KEY,
} from '../constants/server.constants'
import { SettingsDTO } from '../dto/settings.dto'
import { StorageProvisionDTO } from '../dto/storage-provision.dto'
import { StorageProvisionInputDTO } from '../dto/storage-provision-input.dto'
import type { NewServerSetting } from '../entities/server-configuration.entity'
import { serverSettingsTable } from '../entities/server-configuration.entity'
import { ServerConfigurationInvalidException } from '../exceptions/server-configuration-invalid.exception'
import { ServerConfigurationNotFoundException } from '../exceptions/server-configuration-not-found.exception'

@Injectable()
export class ServerConfigurationService {
  constructor(private readonly ormService: OrmService) {}

  async getServerSettingsAsUser(actor: User): Promise<SettingsDTO> {
    if (!actor.isAdmin) {
      throw new UnauthorizedException()
    }
    const results = await this.ormService.db.query.serverSettingsTable.findMany(
      {
        where: inArray(
          serverSettingsTable.key,
          Object.keys(CONFIGURATION_KEYS),
        ),
      },
    )
    return results.reduce(
      (acc, configResult) => ({
        ...acc,
        [configResult.key]: configResult.value,
      }),
      {},
    ) as SettingsDTO
  }

  async getServerConfigurationAsUser(actor: User, configurationKey: string) {
    if (!actor.isAdmin) {
      throw new UnauthorizedException()
    }
    if (!(configurationKey in CONFIGURATION_KEYS)) {
      throw new ServerConfigurationNotFoundException()
    }

    return this.ormService.db.query.serverSettingsTable.findFirst({
      where: eq(serverSettingsTable.key, configurationKey),
    })
  }

  async setServerSettingAsUser(
    actor: User,
    settingKey: string,
    settingValue: any,
  ) {
    if (!actor.isAdmin) {
      throw new UnauthorizedException()
    }

    if (!(settingKey in CONFIGURATION_KEYS)) {
      throw new ServerConfigurationNotFoundException()
    }

    // TODO: validate value
    const existingRecord =
      await this.ormService.db.query.serverSettingsTable.findFirst({
        where: eq(serverSettingsTable.key, settingKey),
      })

    if (existingRecord) {
      return (
        await this.ormService.db
          .update(serverSettingsTable)
          .set({
            value: settingValue,
          })
          .where(eq(serverSettingsTable.key, settingKey))
          .returning()
      )[0]
    } else {
      const now = new Date()
      const values: NewServerSetting = {
        key: settingKey,
        value: settingValue,
        createdAt: now,
        updatedAt: now,
      }
      return (
        await this.ormService.db
          .insert(serverSettingsTable)
          .values(values)
          .returning()
      )[0]
    }
  }

  async resetServerSettingAsUser(actor: User, settingsKey: string) {
    if (!actor.isAdmin) {
      throw new UnauthorizedException()
    }
    await this.ormService.db
      .delete(serverSettingsTable)
      .where(eq(serverSettingsTable.key, settingsKey))
  }

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
        z.nativeEnum(StorageProvisionTypeEnum).parse(provisionType) !==
        provisionType
      ) {
        throw new ServerConfigurationInvalidException()
      }
    }

    const locationWithId = { ...storageProvision, id: uuidV4() }

    const existingRecord =
      await this.ormService.db.query.serverSettingsTable.findFirst({
        where: eq(serverSettingsTable.key, STORAGE_PROVISIONS_KEY.key),
      })

    if (existingRecord) {
      await this.ormService.db
        .update(serverSettingsTable)
        .set({
          value: existingRecord.value.concat([locationWithId]),
          updatedAt: now,
        })
        .where(eq(serverSettingsTable.key, STORAGE_PROVISIONS_KEY.key))
    } else {
      const newServerConfiguration: NewServerSetting = {
        key: STORAGE_PROVISIONS_KEY.key,
        value: [locationWithId],
        createdAt: now,
        updatedAt: now,
      }
      await this.ormService.db
        .insert(serverSettingsTable)
        .values(newServerConfiguration)
    }

    return locationWithId
  }

  async updateServerProvisionAsAdmin(
    actor: User,
    serverProvisionId: string,
    serverProvision: StorageProvisionInputDTO,
  ) {
    const now = new Date()
    if (!actor.isAdmin) {
      throw new UnauthorizedException()
    }

    for (const provisionType of serverProvision.provisionTypes) {
      if (
        z.nativeEnum(StorageProvisionTypeEnum).parse(provisionType) !==
        provisionType
      ) {
        throw new ServerConfigurationInvalidException()
      }
    }

    const existingSettingRecord =
      await this.ormService.db.query.serverSettingsTable.findFirst({
        where: eq(serverSettingsTable.key, STORAGE_PROVISIONS_KEY.key),
      })

    if (!existingSettingRecord) {
      throw new NotFoundException()
    }

    const existingLocation = existingSettingRecord.value.find(
      ({ id }) => id === serverProvisionId,
    )
    if (!existingLocation) {
      throw new NotFoundException()
    } else {
      await this.ormService.db
        .update(serverSettingsTable)
        .set({
          value: existingSettingRecord.value.map((sp: StorageProvisionDTO) =>
            sp.id === serverProvisionId
              ? { ...serverProvision, id: serverProvisionId }
              : sp,
          ),
          updatedAt: now,
        })
        .where(eq(serverSettingsTable.key, STORAGE_PROVISIONS_KEY.key))
    }

    return serverProvision
  }

  async deleteStorageProvisionAsAdmin(actor: User, storageProvisionId: string) {
    if (!actor.isAdmin) {
      throw new UnauthorizedException()
    }
    const now = new Date()
    const existingRecord =
      await this.ormService.db.query.serverSettingsTable.findFirst({
        where: eq(serverSettingsTable.key, STORAGE_PROVISIONS_KEY.key),
      })

    if (!existingRecord) {
      throw new ServerConfigurationNotFoundException()
    }

    const previousCount = existingRecord.value.length

    existingRecord.value = existingRecord.value.filter(
      (v: { id: string }) => v.id !== storageProvisionId,
    )

    if (existingRecord.value.length === previousCount) {
      throw new ServerConfigurationNotFoundException()
    }

    await this.ormService.db
      .update(serverSettingsTable)
      .set({
        value: existingRecord.value,
        updatedAt: now,
      })
      .where(eq(serverSettingsTable.key, STORAGE_PROVISIONS_KEY.key))
    return existingRecord
  }

  async getStorageProvisionById(
    provisionType: StorageProvisionType,
    storageProvisionId: string,
  ) {
    // TODO: check user permissions for access to server configuration values

    if (
      z.nativeEnum(StorageProvisionTypeEnum).parse(provisionType) !==
      provisionType
    ) {
      throw new ServerConfigurationInvalidException()
    }

    const record =
      (await this.ormService.db.query.serverSettingsTable.findFirst({
        where: eq(serverSettingsTable.key, STORAGE_PROVISIONS_KEY.key),
      })) ?? { value: [] }

    return (
      record.value as (StorageProvisionDTO & { secretAccessKey: string })[]
    ).find((v) => v.id === storageProvisionId)
  }

  async listStorageProvisionsAsUser(
    actor: User,
    { provisionType }: { provisionType?: StorageProvisionType } = {},
  ): Promise<(StorageProvisionDTO & StorageProvisionInputDTO)[]> {
    if (
      provisionType &&
      StorageProvisionTypeZodEnum.parse(provisionType) !== provisionType
    ) {
      throw new ServerConfigurationInvalidException()
    }

    const record = await this.ormService.db.query.serverSettingsTable.findFirst(
      {
        where: eq(serverSettingsTable.key, STORAGE_PROVISIONS_KEY.key),
      },
    )

    if (!record) {
      return []
    }

    return provisionType
      ? record.value.filter((r: StorageProvisionDTO) =>
          r.provisionTypes.includes(provisionType),
        )
      : record.value
  }
}
