import { Lifecycle, scoped } from 'tsyringe'
import { v4 as uuidV4 } from 'uuid'

import type { Actor } from '../../auth/actor'
import type {
  ServerLocationData,
  ServerLocationInputData,
} from '../../s3/transfer-objects/s3-location.dto'
import type { ServerLocationType } from '../constants/server.constants'
import {
  CONFIGURATION_KEYS,
  ServerLocationTypeRunType,
} from '../constants/server.constants'
import { ServerConfigurationRepository } from '../entities/server-configuration.repository'
import {
  ServerConfigurationInvalidError,
  ServerConfigurationNotFoundError,
} from '../errors/server-configuration.error'
import type { PublicServerSettings } from '../transfer-objects/settings.dto'

@scoped(Lifecycle.ContainerScoped)
export class ServerConfigurationService {
  constructor(
    private readonly serverConfigurationRepository: ServerConfigurationRepository,
  ) {}

  async getServerSettingsAsUser(_actor: Actor): Promise<PublicServerSettings> {
    // TODO: check user permissions for access to read entire server settings object

    const results = await this.serverConfigurationRepository.find({
      key: { $in: Object.keys(CONFIGURATION_KEYS) },
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

    return this.serverConfigurationRepository.findOne({
      key: configurationKey,
    })
  }

  async setServerSettingAsUser(
    actor: Actor,
    settingKey: string,
    settingValue: any,
  ) {
    // TODO: check user permissions for access to server configuration values

    if (!(settingKey in CONFIGURATION_KEYS)) {
      throw new ServerConfigurationNotFoundError()
    }

    // TODO: validate value

    const record =
      (await this.serverConfigurationRepository.findOne({
        key: settingKey,
      })) ??
      this.serverConfigurationRepository.create({
        key: settingKey,
        value: settingValue,
      })

    record.value = settingValue
    await this.serverConfigurationRepository
      .getEntityManager()
      .persistAndFlush(record)

    return record
  }

  async resetServerSettingAsUser(_actor: Actor, settingsKey: string) {
    // TODO: check user permissions for access reset settings
    await this.serverConfigurationRepository.getEntityManager().removeAndFlush({
      key: settingsKey,
    })
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

    const key = `${type}_LOCATIONS`
    const record =
      (await this.serverConfigurationRepository.findOne({
        key,
      })) ??
      this.serverConfigurationRepository.create({
        key,
        value: [],
      })

    const locationWithId = { ...location, id: uuidV4() }
    record.value.push(locationWithId)

    await this.serverConfigurationRepository
      .getEntityManager()
      .persistAndFlush(record)

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

    const record = await this.serverConfigurationRepository.findOne({
      key: `${type}_LOCATIONS`,
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

    await this.serverConfigurationRepository.getEntityManager().flush()

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

    const record = (await this.serverConfigurationRepository.findOne({
      key: `${type}_LOCATIONS`,
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

    const record = await this.serverConfigurationRepository.findOne({
      key: `${locationTypeValidation.value}_LOCATIONS`,
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
