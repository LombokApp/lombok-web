import {
  ServerStorageDTO,
  StorageProvisionDTO,
  StorageProvisionType,
  StorageProvisionTypeEnum,
  StorageProvisionTypeZodEnum,
} from '@lombokapp/types'
import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common'
import { eq, inArray } from 'drizzle-orm'
import { OrmService } from 'src/orm/orm.service'
import { buildAccessKeyHashId } from 'src/storage/access-key.utils'
import type { User } from 'src/users/entities/user.entity'
import { v4 as uuidV4 } from 'uuid'
import { z } from 'zod'

import {
  CONFIGURATION_KEYS,
  CONFIGURATION_KEYS_MAP,
  SERVER_STORAGE_CONFIG,
  STORAGE_PROVISIONS_CONFIG,
} from '../constants/server.constants'
import { ServerStorageInputDTO } from '../dto/server-storage-input.dto'
import { SettingsDTO } from '../dto/settings.dto'
import {
  StorageProvisionInputDTO,
  StorageProvisionUpdateDTO,
} from '../dto/storage-provision-input.dto'
import type { NewServerSetting } from '../entities/server-configuration.entity'
import { serverSettingsTable } from '../entities/server-configuration.entity'
import { ServerConfigurationInvalidException } from '../exceptions/server-configuration-invalid.exception'
import { ServerConfigurationNotFoundException } from '../exceptions/server-configuration-not-found.exception'

@Injectable()
export class ServerConfigurationService {
  constructor(private readonly ormService: OrmService) {}

  async getServerSettingsAsAdmin(actor: User): Promise<SettingsDTO> {
    if (!actor.isAdmin) {
      throw new UnauthorizedException()
    }
    const results = await this.ormService.db.query.serverSettingsTable.findMany(
      {
        where: inArray(
          serverSettingsTable.key,
          Object.keys(CONFIGURATION_KEYS_MAP),
        ),
      },
    )
    return CONFIGURATION_KEYS.reduce(
      (acc, configObject) => ({
        ...acc,
        [configObject.key]:
          results.find((result) => result.key === configObject.key)?.value ??
          configObject.default,
      }),
      {},
    ) as SettingsDTO
  }

  getServerConfigurationAsUser(actor: User, configurationKey: string) {
    if (!actor.isAdmin) {
      throw new UnauthorizedException()
    }
    if (!(configurationKey in CONFIGURATION_KEYS_MAP)) {
      throw new ServerConfigurationNotFoundException()
    }

    return this.ormService.db.query.serverSettingsTable.findFirst({
      where: eq(serverSettingsTable.key, configurationKey),
    })
  }

  async setServerSettingAsAdmin(
    actor: User,
    settingKey: string,
    settingValue: unknown,
  ) {
    if (!actor.isAdmin) {
      throw new UnauthorizedException()
    }

    if (!(settingKey in CONFIGURATION_KEYS_MAP)) {
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

    const locationWithId = {
      ...storageProvision,
      id: uuidV4(),
      accessKeyHashId: buildAccessKeyHashId({
        accessKeyId: storageProvision.accessKeyId,
        secretAccessKey: storageProvision.secretAccessKey,
        region: storageProvision.region,
        endpoint: storageProvision.endpoint,
      }),
    }

    const existingRecord = (
      await this.ormService.db.query.serverSettingsTable.findFirst({
        where: eq(serverSettingsTable.key, STORAGE_PROVISIONS_CONFIG.key),
      })
    )?.value as (StorageProvisionDTO & StorageProvisionInputDTO)[] | undefined

    if (existingRecord) {
      await this.ormService.db
        .update(serverSettingsTable)
        .set({
          value: existingRecord.concat([locationWithId]),
          updatedAt: now,
        })
        .where(eq(serverSettingsTable.key, STORAGE_PROVISIONS_CONFIG.key))
    } else {
      const newServerConfiguration: NewServerSetting = {
        key: STORAGE_PROVISIONS_CONFIG.key,
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
          z.nativeEnum(StorageProvisionTypeEnum).parse(provisionType) !==
          provisionType
        ) {
          throw new ServerConfigurationInvalidException()
        }
      }
    }

    const existingSettingRecord = (
      await this.ormService.db.query.serverSettingsTable.findFirst({
        where: eq(serverSettingsTable.key, STORAGE_PROVISIONS_CONFIG.key),
      })
    )?.value as (StorageProvisionDTO & StorageProvisionInputDTO)[] | undefined

    if (!existingSettingRecord) {
      throw new NotFoundException()
    }

    const existingLocation = existingSettingRecord.find(
      ({ id }) => id === storageProvisionId,
    )
    if (!existingLocation) {
      throw new NotFoundException()
    } else {
      // Merge partial updates and recompute hash id using existing credentials
      const updatedValue = existingSettingRecord.map(
        (sp: StorageProvisionDTO & StorageProvisionInputDTO) => {
          if (sp.id !== storageProvisionId) {
            return sp
          }
          const merged: StorageProvisionDTO & StorageProvisionInputDTO = {
            ...sp,
            ...storageProvision,
            accessKeyId: sp.accessKeyId,
            secretAccessKey: sp.secretAccessKey,
          }
          const accessKeyHashId = buildAccessKeyHashId({
            accessKeyId: merged.accessKeyId,
            secretAccessKey: merged.secretAccessKey,
            region: merged.region,
            endpoint: merged.endpoint,
          })
          return { ...merged, accessKeyHashId }
        },
      )

      await this.ormService.db
        .update(serverSettingsTable)
        .set({ value: updatedValue, updatedAt: now })
        .where(eq(serverSettingsTable.key, STORAGE_PROVISIONS_CONFIG.key))
    }

    // no return value
  }

  async deleteStorageProvisionAsAdmin(actor: User, storageProvisionId: string) {
    if (!actor.isAdmin) {
      throw new UnauthorizedException()
    }
    const now = new Date()
    const existingRecord = (
      await this.ormService.db.query.serverSettingsTable.findFirst({
        where: eq(serverSettingsTable.key, STORAGE_PROVISIONS_CONFIG.key),
      })
    )?.value as (StorageProvisionDTO & StorageProvisionInputDTO)[] | undefined

    if (!existingRecord) {
      throw new ServerConfigurationNotFoundException()
    }

    const newValue = existingRecord.filter(
      (v: { id: string }) => v.id !== storageProvisionId,
    )

    if (newValue.length === existingRecord.length) {
      throw new ServerConfigurationNotFoundException()
    }

    await this.ormService.db
      .update(serverSettingsTable)
      .set({
        value: newValue,
        updatedAt: now,
      })
      .where(eq(serverSettingsTable.key, STORAGE_PROVISIONS_CONFIG.key))
    return existingRecord
  }

  async getStorageProvisionById(storageProvisionId: string) {
    const record =
      (await this.ormService.db.query.serverSettingsTable.findFirst({
        where: eq(serverSettingsTable.key, STORAGE_PROVISIONS_CONFIG.key),
      })) ?? { value: [] }

    return (
      record.value as (StorageProvisionDTO & {
        secretAccessKey: string
      })[]
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

    const record = (
      await this.ormService.db.query.serverSettingsTable.findFirst({
        where: eq(serverSettingsTable.key, STORAGE_PROVISIONS_CONFIG.key),
      })
    )?.value as (StorageProvisionDTO & StorageProvisionInputDTO)[] | undefined

    if (!record) {
      return []
    }

    return provisionType
      ? record.filter((r: StorageProvisionDTO & StorageProvisionInputDTO) =>
          r.provisionTypes.includes(provisionType),
        )
      : record
  }

  getServerStorageAsAdmin(actor: User): Promise<ServerStorageDTO | undefined> {
    if (!actor.isAdmin) {
      throw new UnauthorizedException()
    }

    return this.getServerStorage()
  }

  async getServerStorage(): Promise<
    (ServerStorageDTO & { secretAccessKey: string }) | undefined
  > {
    const savedLocation = (
      await this.ormService.db.query.serverSettingsTable.findFirst({
        where: eq(serverSettingsTable.key, SERVER_STORAGE_CONFIG.key),
      })
    )?.value as (ServerStorageDTO & { secretAccessKey: string }) | undefined

    return savedLocation
  }

  async setServerStorageAsAdmin(
    actor: User,
    serverStorageInput: ServerStorageInputDTO,
  ) {
    if (!actor.isAdmin) {
      throw new UnauthorizedException()
    }
    const now = new Date()
    const idCondition = eq(serverSettingsTable.key, SERVER_STORAGE_CONFIG.key)
    const existingServerStorageLocation =
      await this.ormService.db.query.serverSettingsTable.findFirst({
        where: idCondition,
      })

    const accessKeyHashId = buildAccessKeyHashId({
      accessKeyId: serverStorageInput.accessKeyId,
      secretAccessKey: serverStorageInput.secretAccessKey,
      region: serverStorageInput.region,
      endpoint: serverStorageInput.endpoint,
    })

    if (existingServerStorageLocation) {
      await this.ormService.db
        .update(serverSettingsTable)
        .set({
          value: {
            ...serverStorageInput,
            accessKeyHashId,
          },
          createdAt: existingServerStorageLocation.createdAt,
          updatedAt: now,
        })
        .where(idCondition)
    } else {
      await this.ormService.db.insert(serverSettingsTable).values({
        key: SERVER_STORAGE_CONFIG.key,
        value: { ...serverStorageInput, accessKeyHashId },
        createdAt: now,
        updatedAt: now,
      })
    }
    return this.getServerStorage()
  }

  async deleteServerStorageLocationAsAdmin(actor: User): Promise<void> {
    if (!actor.isAdmin) {
      throw new UnauthorizedException()
    }

    await this.ormService.db
      .delete(serverSettingsTable)
      .where(eq(serverSettingsTable.key, SERVER_STORAGE_CONFIG.key))
  }
}
