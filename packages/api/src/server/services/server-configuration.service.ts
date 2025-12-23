import {
  ServerStorageLocation,
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
import { appsTable } from 'src/app/entities/app.entity'
import { OrmService } from 'src/orm/orm.service'
import { SearchAppDisabledException } from 'src/search/exceptions/search-app-disabled.exception'
import { SearchAppNotFoundException } from 'src/search/exceptions/search-app-not-found.exception'
import { SearchWorkerNotFoundException } from 'src/search/exceptions/search-worker-not-found.exception'
import { SearchWorkerUnauthorizedException } from 'src/search/exceptions/search-worker-unauthorized.exception'
import { buildAccessKeyHashId } from 'src/storage/access-key.utils'
import type { User } from 'src/users/entities/user.entity'
import { v4 as uuidV4 } from 'uuid'
import { z } from 'zod'

import {
  CONFIGURATION_KEYS,
  CONFIGURATION_KEYS_MAP,
  GOOGLE_OAUTH_CONFIG,
  googleOAuthConfigSchema,
  SEARCH_CONFIG,
  SERVER_STORAGE_CONFIG,
  type ServerConfig,
  SIGNUP_ENABLED_CONFIG,
  STORAGE_PROVISIONS_CONFIG,
} from '../constants/server.constants'
import { PublicSettingsDTO } from '../dto/public-settings.dto'
import { SearchConfigDTO, searchConfigSchema } from '../dto/search-config.dto'
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

  async getPublicServerSettings(): Promise<PublicSettingsDTO> {
    const results = await this.ormService.db.query.serverSettingsTable.findMany(
      {
        where: inArray(serverSettingsTable.key, [
          GOOGLE_OAUTH_CONFIG.key,
          SIGNUP_ENABLED_CONFIG.key,
        ]),
      },
    )

    const googleOAuthConfig = results.find(
      (result) => result.key === GOOGLE_OAUTH_CONFIG.key,
    )?.value as z.infer<typeof googleOAuthConfigSchema> | undefined

    const signupEnabledConfig = results.find(
      (result) => result.key === SIGNUP_ENABLED_CONFIG.key,
    )?.value as boolean | undefined

    return {
      SIGNUP_ENABLED:
        signupEnabledConfig ?? SIGNUP_ENABLED_CONFIG.default ?? false,
      GOOGLE_OAUTH_ENABLED:
        googleOAuthConfig?.enabled ??
        GOOGLE_OAUTH_CONFIG.default?.enabled ??
        false,
    }
  }

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

  private async validateSearchConfig(
    searchConfig: z.infer<typeof searchConfigSchema>,
  ): Promise<void> {
    if (!searchConfig.app) {
      return // null config is valid (means use core search)
    }

    const { identifier, workerIdentifier } = searchConfig.app

    // 1. Check app exists
    const app = await this.ormService.db.query.appsTable.findFirst({
      where: eq(appsTable.identifier, identifier),
    })
    if (!app) {
      throw new SearchAppNotFoundException(identifier)
    }

    // 2. Check app is enabled
    if (!app.enabled) {
      throw new SearchAppDisabledException(identifier)
    }

    // 3. Check worker exists in runtimeWorkers
    if (!app.config.runtimeWorkers?.[workerIdentifier]) {
      throw new SearchWorkerNotFoundException(workerIdentifier, identifier)
    }

    // 4. Check worker is in performSearch array
    const performSearchWorkers =
      app.config.systemRequestRuntimeWorkers?.performSearch ?? []
    if (!performSearchWorkers.includes(workerIdentifier)) {
      throw new SearchWorkerUnauthorizedException(workerIdentifier, identifier)
    }
  }

  private async validateSettingValue(
    settingKey: string,
    settingValue: unknown,
  ): Promise<void> {
    // Validate the value against the associated schema
    const config = CONFIGURATION_KEYS_MAP[settingKey]
    if (!config?.schema.safeParse(settingValue).success) {
      throw new ServerConfigurationInvalidException()
    }

    // Additional validation for SEARCH_CONFIG
    if (settingKey === SEARCH_CONFIG.key) {
      await this.validateSearchConfig(settingValue as SearchConfigDTO)
    }
  }

  async setServerSettingAsAdmin(
    actor: User,
    settingKey: string,
    settingValue: unknown,
  ) {
    if (!actor.isAdmin) {
      throw new UnauthorizedException()
    }

    return this.setServerSetting(settingKey, settingValue)
  }

  async setServerSetting(settingKey: string, settingValue: unknown) {
    if (!(settingKey in CONFIGURATION_KEYS_MAP)) {
      throw new ServerConfigurationNotFoundException()
    }

    await this.validateSettingValue(settingKey, settingValue)

    const existingRecord =
      await this.ormService.db.query.serverSettingsTable.findFirst({
        where: eq(serverSettingsTable.key, settingKey),
      })

    const now = new Date()
    if (existingRecord) {
      return (
        await this.ormService.db
          .update(serverSettingsTable)
          .set({
            value: settingValue,
            updatedAt: now,
          })
          .where(eq(serverSettingsTable.key, settingKey))
          .returning()
      )[0]
    } else {
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

  /**
   * Get the saved server configuration setting or the default value.
   */
  async getServerConfig<T extends z.ZodSchema>(
    config: ServerConfig<T>,
  ): Promise<z.infer<T> | undefined> {
    const result = await this.ormService.db.query.serverSettingsTable.findFirst(
      {
        where: eq(serverSettingsTable.key, config.key),
      },
    )

    if (result) {
      // Validate the stored value against the schema
      if (config.schema.safeParse(result.value).success) {
        return result.value as T
      }
    }

    // No stored value or stored value was invalid, return default
    return config.default as T
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

  async getSearchConfig(): Promise<SearchConfigDTO> {
    return this.getServerConfig(SEARCH_CONFIG).then(
      (config) => config ?? { app: null },
    )
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

  getServerStorageAsAdmin(
    actor: User,
  ): Promise<ServerStorageLocation | undefined> {
    if (!actor.isAdmin) {
      throw new UnauthorizedException()
    }

    return this.getServerStorage()
  }

  async getServerStorage(): Promise<
    (ServerStorageLocation & { secretAccessKey: string }) | undefined
  > {
    const savedLocation = (
      await this.ormService.db.query.serverSettingsTable.findFirst({
        where: eq(serverSettingsTable.key, SERVER_STORAGE_CONFIG.key),
      })
    )?.value as
      | (ServerStorageLocation & { secretAccessKey: string })
      | undefined

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
