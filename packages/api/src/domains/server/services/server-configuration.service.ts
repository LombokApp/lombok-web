import { eq, inArray } from 'drizzle-orm'
import { Lifecycle, scoped } from 'tsyringe'
import { v4 as uuidV4 } from 'uuid'

import { OrmService } from '../../../orm/orm.service'
import type {
  ServerLocationData,
  ServerLocationInputData,
} from '../../storage-location/transfer-objects/s3-location.dto'
import type { User } from '../../user/entities/user.entity'
import type { ServerLocationType } from '../constants/server.constants'
import {
  CONFIGURATION_KEYS,
  ServerLocationTypeRunType,
} from '../constants/server.constants'
import type { NewServerConfiguration } from '../entities/server-configuration.entity'
import { serverConfigurationsTable } from '../entities/server-configuration.entity'
import {
  ServerConfigurationInvalidError,
  ServerConfigurationNotFoundError,
} from '../errors/server-configuration.error'
import type { PublicServerSettings } from '../transfer-objects/settings.dto'

@scoped(Lifecycle.ContainerScoped)
export class ServerConfigurationService {
  constructor(private readonly ormService: OrmService) {}

  async getServerSettingsAsUser(_actor: User): Promise<PublicServerSettings> {
    // TODO: check user permissions for access to read entire server settings object

    const results =
      await this.ormService.db.query.serverConfigurationsTable.findMany({
        where: inArray(
          serverConfigurationsTable.key,
          Object.keys(CONFIGURATION_KEYS),
        ),
      })

    return results.reduce(
      (acc, configResult) => ({
        ...acc,
        [configResult.key]: configResult.value,
      }),
      {},
    ) as PublicServerSettings
  }

  async getServerConfigurationAsUser(userId: string, configurationKey: string) {
    // TODO: check user permissions for access to server configuration values

    if (!(configurationKey in CONFIGURATION_KEYS)) {
      throw new ServerConfigurationNotFoundError()
    }

    return this.ormService.db.query.serverConfigurationsTable.findFirst({
      where: eq(serverConfigurationsTable.key, configurationKey),
    })
  }

  async setServerSettingAsUser(
    user: User,
    settingKey: string,
    settingValue: any,
  ) {
    // TODO: check user permissions for access to server configuration values

    if (!(settingKey in CONFIGURATION_KEYS)) {
      throw new ServerConfigurationNotFoundError()
    }

    // TODO: validate value
    const existingRecord =
      await this.ormService.db.query.serverConfigurationsTable.findFirst({
        where: eq(serverConfigurationsTable.key, settingKey),
      })

    if (existingRecord) {
      return this.ormService.db
        .update(serverConfigurationsTable)
        .set({
          value: settingValue,
        })
        .where(eq(serverConfigurationsTable.key, settingKey))
        .returning()
    } else {
      const now = new Date()
      const values: NewServerConfiguration = {
        key: settingKey,
        value: settingValue,
        createdAt: now,
        updatedAt: now,
      }
      return (
        await this.ormService.db
          .insert(serverConfigurationsTable)
          .values(values)
          .returning()
      )[0]
    }
  }

  async resetServerSettingAsUser(actor: User, settingsKey: string) {
    // TODO: ACL
    await this.ormService.db
      .delete(serverConfigurationsTable)
      .where(eq(serverConfigurationsTable.key, settingsKey))
  }

  async addServerLocationServerConfigurationAsUser(
    userId: string,
    type: ServerLocationType,
    location: ServerLocationInputData,
  ) {
    // TODO: check user permissions for access to server configuration values

    if (!ServerLocationTypeRunType.validate(type).success) {
      throw new ServerConfigurationInvalidError()
    }

    const locationWithId = { ...location, id: uuidV4() }

    const key = `${type}_LOCATIONS`

    const existingRecord =
      await this.ormService.db.query.serverConfigurationsTable.findFirst({
        where: eq(serverConfigurationsTable.key, key),
      })

    if (existingRecord) {
      existingRecord.value = existingRecord.value.push(locationWithId)
    } else {
      const now = new Date()
      const newServerConfiguration: NewServerConfiguration = {
        key,
        value: [locationWithId],
        createdAt: now,
        updatedAt: now,
      }
      await this.ormService.db
        .insert(serverConfigurationsTable)
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
      throw new ServerConfigurationInvalidError()
    }

    const record =
      await this.ormService.db.query.serverConfigurationsTable.findFirst({
        where: eq(serverConfigurationsTable.key, `${type}_LOCATIONS`),
      })

    if (!record) {
      throw new ServerConfigurationNotFoundError()
    }

    const previousCount = record.value.length

    record.value = record.value.filter(
      (v: { id: string }) => v.id !== locationId,
    )

    if (record.value.length === previousCount) {
      throw new ServerConfigurationNotFoundError()
    }

    return record
  }

  async getConfiguredServerLocationById(
    type: ServerLocationType,
    serverLocationId: string,
  ) {
    // TODO: check user permissions for access to server configuration values

    if (!ServerLocationTypeRunType.validate(type).success) {
      throw new ServerConfigurationInvalidError()
    }

    const record =
      (await this.ormService.db.query.serverConfigurationsTable.findFirst({
        where: eq(serverConfigurationsTable.key, `${type}_LOCATIONS`),
      })) ?? { value: [] }

    return (record.value as (ServerLocationInputData & { id: string })[]).find(
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
      throw new ServerConfigurationInvalidError()
    }

    const record =
      await this.ormService.db.query.serverConfigurationsTable.findFirst({
        where: eq(
          serverConfigurationsTable.key,
          `${locationTypeValidation.value}_LOCATIONS`,
        ),
      })

    if (!record) {
      return []
    }

    return record.value.map((location: ServerLocationData) => ({
      id: location.id,
      name: location.name,
      endpoint: location.endpoint,
      region: location.region,
      accessKeyId: location.accessKeyId,
      bucket: location.bucket,
      prefix: location.prefix,
    })) as ServerLocationData[]
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
