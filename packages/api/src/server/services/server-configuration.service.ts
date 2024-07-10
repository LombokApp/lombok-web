import { Injectable } from '@nestjs/common'
import { eq, inArray } from 'drizzle-orm'
import type { ServerLocationDTO } from 'src/locations/transfer-objects/server-location.dto'
import type { ServerLocationInputDTO } from 'src/locations/transfer-objects/server-location-input.dto'
import { OrmService } from 'src/orm/orm.service'
import type { User } from 'src/users/entities/user.entity'
import { v4 as uuidV4 } from 'uuid'

import type { ServerLocationType } from '../constants/server.constants'
import {
  CONFIGURATION_KEYS,
  ServerLocationTypeRunType,
} from '../constants/server.constants'
import { SettingsDTO } from '../dto/settings.dto'
import type { NewServerSetting } from '../entities/server-configuration.entity'
import { serverSettingsTable } from '../entities/server-configuration.entity'
import { ServerConfigurationInvalidException } from '../exceptions/server-configuration-invalid.exception'
import { ServerConfigurationNotFoundException } from '../exceptions/server-configuration-not-found.exception'

@Injectable()
export class ServerConfigurationService {
  constructor(private readonly ormService: OrmService) {}

  async getServerSettingsAsUser(_actor: User): Promise<SettingsDTO> {
    // TODO: check user permissions for access to read entire server settings object

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

  async getServerConfigurationAsUser(userId: string, configurationKey: string) {
    // TODO: check user permissions for access to server configuration values

    if (!(configurationKey in CONFIGURATION_KEYS)) {
      throw new ServerConfigurationNotFoundException()
    }

    return this.ormService.db.query.serverSettingsTable.findFirst({
      where: eq(serverSettingsTable.key, configurationKey),
    })
  }

  async setServerSettingAsUser(
    user: User,
    settingKey: string,
    settingValue: any,
  ) {
    // TODO: check user permissions for access to server configuration values

    if (!(settingKey in CONFIGURATION_KEYS)) {
      throw new ServerConfigurationNotFoundException()
    }

    // TODO: validate value
    const existingRecord =
      await this.ormService.db.query.serverSettingsTable.findFirst({
        where: eq(serverSettingsTable.key, settingKey),
      })

    if (existingRecord) {
      return this.ormService.db
        .update(serverSettingsTable)
        .set({
          value: settingValue,
        })
        .where(eq(serverSettingsTable.key, settingKey))
        .returning()[0]
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
    // TODO: ACL
    await this.ormService.db
      .delete(serverSettingsTable)
      .where(eq(serverSettingsTable.key, settingsKey))
  }

  async addServerLocationServerConfigurationAsUser(
    userId: string,
    type: ServerLocationType,
    location: ServerLocationInputDTO,
  ) {
    // TODO: check user permissions for access to server configuration values

    if (!ServerLocationTypeRunType.validate(type).success) {
      throw new ServerConfigurationInvalidException()
    }

    const locationWithId = { ...location, id: uuidV4() }

    const key = `${type}_LOCATIONS`

    const existingRecord =
      await this.ormService.db.query.serverSettingsTable.findFirst({
        where: eq(serverSettingsTable.key, key),
      })

    if (existingRecord) {
      existingRecord.value = existingRecord.value.push(locationWithId)
    } else {
      const now = new Date()
      const newServerConfiguration: NewServerSetting = {
        key,
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

  async deleteServerLocationServerConfigurationAsUser(
    userId: string,
    type: ServerLocationType,
    locationId: string,
  ) {
    // TODO: check user permissions for access to server configuration values

    if (!ServerLocationTypeRunType.validate(type).success) {
      throw new ServerConfigurationInvalidException()
    }

    const record = await this.ormService.db.query.serverSettingsTable.findFirst(
      {
        where: eq(serverSettingsTable.key, `${type}_LOCATIONS`),
      },
    )

    if (!record) {
      throw new ServerConfigurationNotFoundException()
    }

    const previousCount = record.value.length

    record.value = record.value.filter(
      (v: { id: string }) => v.id !== locationId,
    )

    if (record.value.length === previousCount) {
      throw new ServerConfigurationNotFoundException()
    }

    return record
  }

  async getConfiguredServerLocationById(
    type: ServerLocationType,
    serverLocationId: string,
  ) {
    // TODO: check user permissions for access to server configuration values

    if (!ServerLocationTypeRunType.validate(type).success) {
      throw new ServerConfigurationInvalidException()
    }

    const record =
      (await this.ormService.db.query.serverSettingsTable.findFirst({
        where: eq(serverSettingsTable.key, `${type}_LOCATIONS`),
      })) ?? { value: [] }

    return (record.value as (ServerLocationInputDTO & { id: string })[]).find(
      (v) => v.id === serverLocationId,
    )
  }

  async listConfiguredServerLocationsAsUser(
    userId: string,
    type: ServerLocationType,
  ) {
    // TODO: check user permissions for access to server configuration values

    const locationTypeValidation = ServerLocationTypeRunType.validate(type)
    if (!locationTypeValidation.success) {
      throw new ServerConfigurationInvalidException()
    }

    const record = await this.ormService.db.query.serverSettingsTable.findFirst(
      {
        where: eq(
          serverSettingsTable.key,
          `${locationTypeValidation.value}_LOCATIONS`,
        ),
      },
    )

    if (!record) {
      return []
    }

    return record.value.map((location: ServerLocationDTO) => ({
      id: location.id,
      name: location.name,
      endpoint: location.endpoint,
      region: location.region,
      accessKeyId: location.accessKeyId,
      bucket: location.bucket,
      prefix: location.prefix,
    })) as ServerLocationDTO[]
  }

  // async getUserFolderLocationsServerConfigurationAsUser(_userId: string) {
  //   // TODO: check user permissions for access to server configuration values

  //   const record = await this.serverConfigurationRepository.findOne({
  //     key: USER_FOLDERS_LOCATIONS_KEY,
  //   })

  //   return record || { value: [] }
  // }

  // async deleteUserFoldersLocationServerConfigurationAsUser(
  //   userId: string,
  //   id: any,
  // ) {
  //   // TODO: check user permissions for access to server configuration values

  //   const record = await this.serverConfigurationRepository.findOne({
  //     key: USER_FOLDERS_LOCATIONS_KEY,
  //   })

  //   if (!record) {
  //     throw new ServerConfigurationNotFoundError()
  //   }

  //   const previousCount = record.value.length

  //   record.value = record.value.filter((v: { id: string }) => v.id !== id)

  //   if (record.value.length === previousCount) {
  //     throw new ServerConfigurationNotFoundError()
  //   }

  //   await this.serverConfigurationRepository.getEntityManager().flush()

  //   return record
  // }
}
