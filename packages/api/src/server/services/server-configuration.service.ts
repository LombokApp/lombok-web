import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common'
import {
  UserStorageProvisionType,
  UserStorageProvisionTypeEnum,
  UserStorageProvisionTypeZodEnum,
} from '@stellariscloud/types'
import { eq, inArray } from 'drizzle-orm'
import { OrmService } from 'src/orm/orm.service'
import { buildAccessKeyHashId } from 'src/storage/access-key.utils'
import type { User } from 'src/users/entities/user.entity'
import { v4 as uuidV4 } from 'uuid'
import { z } from 'zod'

import {
  CONFIGURATION_KEYS,
  SERVER_STORAGE_LOCATION_KEY,
  USER_STORAGE_PROVISIONS_KEY,
} from '../constants/server.constants'
import { ServerStorageLocationDTO } from '../dto/server-storage-location.dto'
import { ServerStorageLocationInputDTO } from '../dto/server-storage-location-input.dto'
import { SettingsDTO } from '../dto/settings.dto'
import { UserStorageProvisionDTO } from '../dto/user-storage-provision.dto'
import { UserStorageProvisionInputDTO } from '../dto/user-storage-provision-input.dto'
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

  async setServerSettingAsAdmin(
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
    storageProvision: UserStorageProvisionInputDTO,
  ) {
    if (!actor.isAdmin) {
      throw new UnauthorizedException()
    }
    const now = new Date()

    for (const provisionType of storageProvision.provisionTypes) {
      if (
        z.nativeEnum(UserStorageProvisionTypeEnum).parse(provisionType) !==
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

    const existingRecord =
      await this.ormService.db.query.serverSettingsTable.findFirst({
        where: eq(serverSettingsTable.key, USER_STORAGE_PROVISIONS_KEY.key),
      })

    if (existingRecord) {
      await this.ormService.db
        .update(serverSettingsTable)
        .set({
          value: existingRecord.value.concat([locationWithId]),
          updatedAt: now,
        })
        .where(eq(serverSettingsTable.key, USER_STORAGE_PROVISIONS_KEY.key))
    } else {
      const newServerConfiguration: NewServerSetting = {
        key: USER_STORAGE_PROVISIONS_KEY.key,
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

  async updateUserStorageProvisionAsAdmin(
    actor: User,
    storageProvisionId: string,
    storageProvision: UserStorageProvisionInputDTO,
  ) {
    const now = new Date()
    if (!actor.isAdmin) {
      throw new UnauthorizedException()
    }

    for (const provisionType of storageProvision.provisionTypes) {
      if (
        z.nativeEnum(UserStorageProvisionTypeEnum).parse(provisionType) !==
        provisionType
      ) {
        throw new ServerConfigurationInvalidException()
      }
    }

    const existingSettingRecord =
      await this.ormService.db.query.serverSettingsTable.findFirst({
        where: eq(serverSettingsTable.key, USER_STORAGE_PROVISIONS_KEY.key),
      })

    if (!existingSettingRecord) {
      throw new NotFoundException()
    }

    const existingLocation = existingSettingRecord.value.find(
      ({ id }) => id === storageProvisionId,
    )
    if (!existingLocation) {
      throw new NotFoundException()
    } else {
      await this.ormService.db
        .update(serverSettingsTable)
        .set({
          value: existingSettingRecord.value.map(
            (sp: UserStorageProvisionDTO) =>
              sp.id === storageProvisionId
                ? {
                    ...storageProvision,
                    id: storageProvisionId,
                    accessKeyHashId: buildAccessKeyHashId({
                      accessKeyId: storageProvision.accessKeyId,
                      secretAccessKey: storageProvision.secretAccessKey,
                      region: storageProvision.region,
                      endpoint: storageProvision.endpoint,
                    }),
                  }
                : sp,
          ),
          updatedAt: now,
        })
        .where(eq(serverSettingsTable.key, USER_STORAGE_PROVISIONS_KEY.key))
    }

    return storageProvision
  }

  async deleteUserStorageProvisionAsAdmin(
    actor: User,
    storageProvisionId: string,
  ) {
    if (!actor.isAdmin) {
      throw new UnauthorizedException()
    }
    const now = new Date()
    const existingRecord =
      await this.ormService.db.query.serverSettingsTable.findFirst({
        where: eq(serverSettingsTable.key, USER_STORAGE_PROVISIONS_KEY.key),
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
      .where(eq(serverSettingsTable.key, USER_STORAGE_PROVISIONS_KEY.key))
    return existingRecord
  }

  async getUserStorageProvisionById(storageProvisionId: string) {
    // TODO: check user permissions for access to server configuration values

    const record =
      (await this.ormService.db.query.serverSettingsTable.findFirst({
        where: eq(serverSettingsTable.key, USER_STORAGE_PROVISIONS_KEY.key),
      })) ?? { value: [] }

    return (
      record.value as (UserStorageProvisionDTO & { secretAccessKey: string })[]
    ).find((v) => v.id === storageProvisionId)
  }

  async listUserStorageProvisionsAsUser(
    actor: User,
    { provisionType }: { provisionType?: UserStorageProvisionType } = {},
  ): Promise<(UserStorageProvisionDTO & UserStorageProvisionInputDTO)[]> {
    if (
      provisionType &&
      UserStorageProvisionTypeZodEnum.parse(provisionType) !== provisionType
    ) {
      throw new ServerConfigurationInvalidException()
    }

    const record = await this.ormService.db.query.serverSettingsTable.findFirst(
      {
        where: eq(serverSettingsTable.key, USER_STORAGE_PROVISIONS_KEY.key),
      },
    )

    if (!record) {
      return []
    }

    return provisionType
      ? record.value.filter((r: UserStorageProvisionDTO) =>
          r.provisionTypes.includes(provisionType),
        )
      : record.value
  }

  async getServerStorageLocationAsAdmin(
    actor: User,
  ): Promise<ServerStorageLocationDTO | undefined> {
    if (!actor.isAdmin) {
      throw new UnauthorizedException()
    }

    return this.getServerStorageLocation()
  }

  async getServerStorageLocation(): Promise<
    (ServerStorageLocationDTO & { secretAccessKey: string }) | undefined
  > {
    const savedLocation =
      await this.ormService.db.query.serverSettingsTable.findFirst({
        where: eq(serverSettingsTable.key, SERVER_STORAGE_LOCATION_KEY.key),
      })

    return savedLocation ? savedLocation.value : undefined
  }

  async setServerStorageLocationAsAdmin(
    actor: User,
    appStorageProvisionInput: ServerStorageLocationInputDTO,
  ) {
    if (!actor.isAdmin) {
      throw new UnauthorizedException()
    }
    const now = new Date()
    const idCondition = eq(
      serverSettingsTable.key,
      SERVER_STORAGE_LOCATION_KEY.key,
    )
    const existingServerStorageLocation =
      await this.ormService.db.query.serverSettingsTable.findFirst({
        where: idCondition,
      })

    const accessKeyHashId = buildAccessKeyHashId({
      accessKeyId: appStorageProvisionInput.accessKeyId,
      secretAccessKey: appStorageProvisionInput.secretAccessKey,
      region: appStorageProvisionInput.region,
      endpoint: appStorageProvisionInput.endpoint,
    })

    if (existingServerStorageLocation) {
      await this.ormService.db
        .update(serverSettingsTable)
        .set({
          value: {
            ...appStorageProvisionInput,
            accessKeyHashId,
          },
          createdAt: existingServerStorageLocation.createdAt,
          updatedAt: now,
        })
        .where(idCondition)
    } else {
      await this.ormService.db.insert(serverSettingsTable).values({
        key: SERVER_STORAGE_LOCATION_KEY.key,
        value: { ...appStorageProvisionInput, accessKeyHashId },
        createdAt: now,
        updatedAt: now,
      })
    }
    return this.getServerStorageLocation()
  }

  async deleteServerStorageLocationAsAdmin(actor: User): Promise<void> {
    if (!actor.isAdmin) {
      throw new UnauthorizedException()
    }

    await this.ormService.db
      .delete(serverSettingsTable)
      .where(eq(serverSettingsTable.key, SERVER_STORAGE_LOCATION_KEY.key))
  }
}
