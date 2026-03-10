import type { AppSettingsConfig, JsonSchema07Object } from '@lombokapp/types'
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { and, eq } from 'drizzle-orm'
import { OrmService } from 'src/orm/orm.service'

import { type App, appsTable } from '../entities/app.entity'
import { appCustomFolderSettingsTable } from '../entities/app-custom-folder-settings.entity'
import { appCustomUserSettingsTable } from '../entities/app-custom-user-settings.entity'
import {
  maskSecretValues,
  mergeWithSecretPreservation,
} from '../utils/custom-settings-secrets.utils'
import { jsonSchemaToPartialZod } from '../utils/json-schema-to-zod.util'
import {
  resolveCustomSettings,
  type ResolvedCustomSettings,
} from '../utils/resolve-custom-settings.utils'

const MAX_VALUES_SIZE = 64 * 1024 // 64KB

interface CustomSettingsGetResponse {
  values: Record<string, unknown>
  sources: Record<string, 'default' | 'folder' | 'user'>
  schema: JsonSchema07Object | null
  secretKeyPattern: string | null
}

@Injectable()
export class AppCustomSettingsService {
  constructor(private readonly ormService: OrmService) {}

  private getSettingsConfig(app: App): AppSettingsConfig | undefined {
    return app.config.settings
  }

  private validateValuesSize(values: Record<string, unknown>): void {
    if (JSON.stringify(values).length > MAX_VALUES_SIZE) {
      throw new BadRequestException(
        'Settings values exceed maximum size of 64KB',
      )
    }
  }

  private validateValues(
    schema: JsonSchema07Object,
    values: Record<string, unknown>,
  ): void {
    const partialSchema = jsonSchemaToPartialZod(schema)
    const result = partialSchema.safeParse(values)
    if (!result.success) {
      throw new BadRequestException({
        message: 'Invalid settings values',
        errors: result.error.issues,
      })
    }
  }

  // --- User-level custom settings ---

  async getUserCustomSettings(
    userId: string,
    app: App,
  ): Promise<CustomSettingsGetResponse> {
    const settingsConfig = this.getSettingsConfig(app)
    const schema = settingsConfig?.user ?? null

    if (!schema) {
      return {
        values: {},
        sources: {},
        schema: null,
        secretKeyPattern: settingsConfig?.secretKeyPattern ?? null,
      }
    }

    const stored =
      await this.ormService.db.query.appCustomUserSettingsTable.findFirst({
        where: and(
          eq(appCustomUserSettingsTable.userId, userId),
          eq(appCustomUserSettingsTable.appIdentifier, app.identifier),
        ),
      })

    const resolved = resolveCustomSettings(schema, stored?.values, undefined)

    return {
      values: maskSecretValues(
        resolved.values,
        settingsConfig?.secretKeyPattern,
      ),
      sources: resolved.sources,
      schema,
      secretKeyPattern: settingsConfig?.secretKeyPattern ?? null,
    }
  }

  async getUserCustomSettingsUnmasked(
    userId: string,
    app: App,
  ): Promise<{ values: Record<string, unknown> }> {
    const settingsConfig = this.getSettingsConfig(app)
    const schema = settingsConfig?.user ?? null

    if (!schema) {
      return { values: {} }
    }

    const stored =
      await this.ormService.db.query.appCustomUserSettingsTable.findFirst({
        where: and(
          eq(appCustomUserSettingsTable.userId, userId),
          eq(appCustomUserSettingsTable.appIdentifier, app.identifier),
        ),
      })

    const resolved = resolveCustomSettings(schema, stored?.values, undefined)
    return { values: resolved.values }
  }

  async putUserCustomSettings(
    userId: string,
    app: App,
    incomingValues: Record<string, unknown>,
  ): Promise<CustomSettingsGetResponse> {
    const settingsConfig = this.getSettingsConfig(app)
    const schema = settingsConfig?.user

    if (!schema) {
      throw new BadRequestException(
        'This app does not define user-level custom settings',
      )
    }

    this.validateValues(schema, incomingValues)

    const existing =
      await this.ormService.db.query.appCustomUserSettingsTable.findFirst({
        where: and(
          eq(appCustomUserSettingsTable.userId, userId),
          eq(appCustomUserSettingsTable.appIdentifier, app.identifier),
        ),
      })

    const merged = mergeWithSecretPreservation(
      incomingValues,
      existing?.values ?? {},
      settingsConfig.secretKeyPattern,
    )

    this.validateValuesSize(merged)

    const now = new Date()

    if (existing) {
      await this.ormService.db
        .update(appCustomUserSettingsTable)
        .set({ values: merged, updatedAt: now })
        .where(
          and(
            eq(appCustomUserSettingsTable.userId, userId),
            eq(appCustomUserSettingsTable.appIdentifier, app.identifier),
          ),
        )
    } else {
      await this.ormService.db.insert(appCustomUserSettingsTable).values({
        userId,
        appIdentifier: app.identifier,
        values: merged,
        createdAt: now,
        updatedAt: now,
      })
    }

    return this.getUserCustomSettings(userId, app)
  }

  async deleteUserCustomSettings(userId: string, app: App): Promise<void> {
    await this.ormService.db
      .delete(appCustomUserSettingsTable)
      .where(
        and(
          eq(appCustomUserSettingsTable.userId, userId),
          eq(appCustomUserSettingsTable.appIdentifier, app.identifier),
        ),
      )
  }

  // --- Folder-level custom settings ---

  async getFolderCustomSettings(
    userId: string,
    folderId: string,
    app: App,
  ): Promise<CustomSettingsGetResponse> {
    const settingsConfig = this.getSettingsConfig(app)
    const schema = settingsConfig?.folder ?? null

    if (!schema) {
      return {
        values: {},
        sources: {},
        schema: null,
        secretKeyPattern: settingsConfig?.secretKeyPattern ?? null,
      }
    }

    const [userStored, folderStored] = await Promise.all([
      this.ormService.db.query.appCustomUserSettingsTable.findFirst({
        where: and(
          eq(appCustomUserSettingsTable.userId, userId),
          eq(appCustomUserSettingsTable.appIdentifier, app.identifier),
        ),
      }),
      this.ormService.db.query.appCustomFolderSettingsTable.findFirst({
        where: and(
          eq(appCustomFolderSettingsTable.folderId, folderId),
          eq(appCustomFolderSettingsTable.appIdentifier, app.identifier),
        ),
      }),
    ])

    // For folder-level resolution, we use the folder schema for property keys
    // but cascade folder -> user -> defaults.
    // The user values here are filtered to only include keys defined in the folder schema.
    const userValuesForFolderSchema = this.filterValuesToSchema(
      userStored?.values,
      schema,
    )

    const resolved: ResolvedCustomSettings = resolveCustomSettings(
      schema,
      userValuesForFolderSchema,
      folderStored?.values,
    )

    return {
      values: maskSecretValues(
        resolved.values,
        settingsConfig?.secretKeyPattern,
      ),
      sources: resolved.sources,
      schema,
      secretKeyPattern: settingsConfig?.secretKeyPattern ?? null,
    }
  }

  async putFolderCustomSettings(
    folderId: string,
    app: App,
    incomingValues: Record<string, unknown>,
  ): Promise<void> {
    const settingsConfig = this.getSettingsConfig(app)
    const schema = settingsConfig?.folder

    if (!schema) {
      throw new BadRequestException(
        'This app does not define folder-level custom settings',
      )
    }

    this.validateValues(schema, incomingValues)

    const existing =
      await this.ormService.db.query.appCustomFolderSettingsTable.findFirst({
        where: and(
          eq(appCustomFolderSettingsTable.folderId, folderId),
          eq(appCustomFolderSettingsTable.appIdentifier, app.identifier),
        ),
      })

    const merged = mergeWithSecretPreservation(
      incomingValues,
      existing?.values ?? {},
      settingsConfig.secretKeyPattern,
    )

    this.validateValuesSize(merged)

    const now = new Date()

    if (existing) {
      await this.ormService.db
        .update(appCustomFolderSettingsTable)
        .set({ values: merged, updatedAt: now })
        .where(
          and(
            eq(appCustomFolderSettingsTable.folderId, folderId),
            eq(appCustomFolderSettingsTable.appIdentifier, app.identifier),
          ),
        )
    } else {
      await this.ormService.db.insert(appCustomFolderSettingsTable).values({
        folderId,
        appIdentifier: app.identifier,
        values: merged,
        createdAt: now,
        updatedAt: now,
      })
    }
  }

  async deleteFolderCustomSettings(folderId: string, app: App): Promise<void> {
    await this.ormService.db
      .delete(appCustomFolderSettingsTable)
      .where(
        and(
          eq(appCustomFolderSettingsTable.folderId, folderId),
          eq(appCustomFolderSettingsTable.appIdentifier, app.identifier),
        ),
      )
  }

  // --- Helper: get app or throw ---

  async getAppOrThrow(appIdentifier: string): Promise<App> {
    const app = await this.ormService.db.query.appsTable.findFirst({
      where: eq(appsTable.identifier, appIdentifier),
    })
    if (!app) {
      throw new NotFoundException(`App not found: ${appIdentifier}`)
    }
    return app
  }

  private filterValuesToSchema(
    values: Record<string, unknown> | undefined,
    schema: JsonSchema07Object,
  ): Record<string, unknown> | undefined {
    if (!values) {
      return undefined
    }
    const filtered: Record<string, unknown> = {}
    for (const key of Object.keys(schema.properties)) {
      if (key in values) {
        filtered[key] = values[key]
      }
    }
    return Object.keys(filtered).length > 0 ? filtered : undefined
  }
}
