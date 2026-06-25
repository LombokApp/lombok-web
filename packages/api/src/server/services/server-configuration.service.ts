import { Inject, Injectable, UnauthorizedException } from '@nestjs/common'
import nestjsConfig from '@nestjs/config'
import { eq, inArray } from 'drizzle-orm'
import { appsTable } from 'src/app/entities/app.entity'
import { coreConfig } from 'src/core/config'
import { OrmService } from 'src/orm/orm.service'
import { SearchAppDisabledException } from 'src/search/exceptions/search-app-disabled.exception'
import { SearchAppNotFoundException } from 'src/search/exceptions/search-app-not-found.exception'
import { SearchWorkerNotFoundException } from 'src/search/exceptions/search-worker-not-found.exception'
import { SearchWorkerUnauthorizedException } from 'src/search/exceptions/search-worker-unauthorized.exception'
import { buildImageUrls } from 'src/shared/utils'
import type { User } from 'src/users/entities/user.entity'
import { z } from 'zod'

import {
  CONFIGURATION_KEYS,
  CONFIGURATION_KEYS_MAP,
  GOOGLE_OAUTH_CONFIG,
  googleOAuthConfigSchema,
  SEARCH_CONFIG,
  SERVER_ICON_CONFIG,
  type ServerSettingsEntry,
  SIGNUP_ENABLED_CONFIG,
} from '../constants/server.constants'
import { PublicSettingsDTO } from '../dto/public-settings.dto'
import { SearchConfigDTO, searchConfigSchema } from '../dto/search-config.dto'
import { SettingsDTO } from '../dto/settings.dto'
import type { NewServerSetting } from '../entities/server-configuration.entity'
import { serverSettingsTable } from '../entities/server-configuration.entity'
import { ServerConfigurationInvalidException } from '../exceptions/server-configuration-invalid.exception'
import { ServerConfigurationNotFoundException } from '../exceptions/server-configuration-not-found.exception'

@Injectable()
export class ServerConfigurationService {
  constructor(
    private readonly ormService: OrmService,
    @Inject(coreConfig.KEY)
    private readonly _coreConfig: nestjsConfig.ConfigType<typeof coreConfig>,
  ) {}

  async getPublicServerSettings(): Promise<PublicSettingsDTO> {
    const results = await this.ormService.db.query.serverSettingsTable.findMany(
      {
        where: inArray(serverSettingsTable.key, [
          GOOGLE_OAUTH_CONFIG.key,
          SIGNUP_ENABLED_CONFIG.key,
          SERVER_ICON_CONFIG.key,
        ]),
      },
    )

    const googleOAuthConfig = results.find(
      (result) => result.key === GOOGLE_OAUTH_CONFIG.key,
    )?.value as z.infer<typeof googleOAuthConfigSchema> | undefined

    const signupEnabledConfig = results.find(
      (result) => result.key === SIGNUP_ENABLED_CONFIG.key,
    )?.value as boolean | undefined

    const serverIconConfig = results.find(
      (result) => result.key === SERVER_ICON_CONFIG.key,
    )?.value as { updatedAt?: string } | undefined

    const serverIconUpdatedAt = serverIconConfig?.updatedAt
      ? new Date(serverIconConfig.updatedAt)
      : null

    return {
      SIGNUP_ENABLED:
        signupEnabledConfig ?? SIGNUP_ENABLED_CONFIG.default ?? false,
      GOOGLE_OAUTH_ENABLED:
        googleOAuthConfig?.enabled ??
        GOOGLE_OAUTH_CONFIG.default?.enabled ??
        false,
      serverIcon: buildImageUrls('/api/v1/server/icon', serverIconUpdatedAt),
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

    return CONFIGURATION_KEYS.reduce((acc, configObject) => {
      const rawValue =
        results.find((result) => result.key === configObject.key)?.value ??
        configObject.default
      if (results.find((result) => result.key === configObject.key)) {
        const parsedValue = configObject.dbSchema.safeParse(rawValue)
        if (!parsedValue.success) {
          console.error(
            `Invalid value for config ${configObject.key}: ${JSON.stringify(parsedValue.error)}`,
          )
          return acc
        }
        acc[configObject.key] = configObject.transformForResponse(
          parsedValue.data,
        )
      } else {
        acc[configObject.key] = configObject.default
      }

      return acc
    }, {})
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

  private async validateSettingInputValue(
    settingKey: string,
    settingValue: unknown,
  ): Promise<void> {
    // Validate the value against the associated schema
    const config = CONFIGURATION_KEYS_MAP[settingKey]
    if (!config?.inputSchema.safeParse(settingValue).success) {
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

    await this.validateSettingInputValue(settingKey, settingValue)

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
  async getServerConfig<T extends ServerSettingsEntry<z.ZodType>>(
    config: T,
  ): Promise<z.infer<T['dbSchema']> | undefined> {
    const result = await this.ormService.db.query.serverSettingsTable.findFirst(
      {
        where: eq(serverSettingsTable.key, config.key),
      },
    )

    if (result) {
      // Validate the stored value against the schema
      if (config.dbSchema.safeParse(result.value).success) {
        return result.value as z.infer<T['dbSchema']>
      }
    }

    // No stored value or stored value was invalid, return default
    return config.default as z.infer<T['dbSchema']> | undefined
  }

  async getSearchConfig(): Promise<SearchConfigDTO> {
    return this.getServerConfig(SEARCH_CONFIG).then(
      (config) => config ?? { app: null },
    )
  }
}
