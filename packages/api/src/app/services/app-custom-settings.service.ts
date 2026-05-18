import type { AppSettingsConfig, JsonSchema07Object } from '@lombokapp/types'
import { SETTINGS_KEY_REGEX } from '@lombokapp/types'
import {
  BadRequestException,
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { and, eq, sql } from 'drizzle-orm'
import { OrmService } from 'src/orm/orm.service'
import { AppUserSocketService } from 'src/socket/app-user/app-user-socket.service'

import { type App, appsTable } from '../entities/app.entity'
import { appCustomFolderSettingsTable } from '../entities/app-custom-folder-settings.entity'
import { appCustomUserSettingsTable } from '../entities/app-custom-user-settings.entity'
import { maskSecretValues } from '../utils/custom-settings-secrets.utils'
import {
  flattenZodIssues,
  type FormattedZodIssue,
  summariseZodError,
} from '../utils/format-zod-issues'
import { jsonSchemaPropertyToZod } from '../utils/json-schema-to-zod.util'
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
  constructor(
    private readonly ormService: OrmService,
    @Inject(forwardRef(() => AppUserSocketService))
    private readonly appUserSocketService: AppUserSocketService,
  ) {}

  /**
   * Notify every open browser tab of `userId` that `app`'s user-scoped
   * settings just changed, so the UI can refetch its cached settings query
   * without a manual reload. Mirrors the `<entity>_changed` event shape that
   * runtime workers emit via `serverClient.emitEvent`, so apps can use a
   * single listener (`useAppEvent('<app>', 'settings_changed')`) regardless
   * of whether the mutation came from the platform settings UI or the app's
   * own API. Best-effort — a failed broadcast must not break the patch.
   */
  private broadcastUserSettingsChanged(userId: string, app: App): void {
    try {
      this.appUserSocketService.emitUpdate({
        update: {
          code: `app:${app.identifier}:settings_changed`,
          data: {
            emitterIdentifier: app.identifier,
            eventIdentifier: 'settings_changed',
            targetUserId: userId,
            targetLocationFolderId: null,
            targetLocationObjectKey: null,
            data: {},
            createdAt: new Date().toISOString(),
          },
        },
        scope: {
          targetUserId: userId,
          targetAppIdentifier: app.identifier,
          targetLocationFolderId: null,
        },
      })
    } catch {
      // Non-fatal: cross-tab sync best-effort.
    }
  }

  private getSettingsConfig(app: App): AppSettingsConfig | undefined {
    return app.config.settings
  }

  private validatePatchValues(
    schema: JsonSchema07Object,
    values: Record<string, unknown>,
  ): void {
    // Collect every issue across every key before throwing — surfacing one
    // error at a time forces apps to fix-and-retry in a tight loop, which is
    // especially painful when the failure is in a deeply-nested schema (e.g.
    // a single field of a single OAuth provider config). Each leaf carries
    // the offending top-level key as the first path segment.
    const issues: FormattedZodIssue[] = []
    const summaries: string[] = []
    for (const [key, value] of Object.entries(values)) {
      if (!SETTINGS_KEY_REGEX.test(key)) {
        issues.push({
          path: key,
          message:
            'Setting key must be lowercase a-z / 0-9 / _ and must not start or end with _',
        })
        summaries.push(`Setting "${key}":\n  • invalid key format`)
        continue
      }
      const zodSchema = jsonSchemaPropertyToZod(schema, key)
      if (zodSchema === null) {
        issues.push({ path: key, message: 'Unknown setting key' })
        summaries.push(`Setting "${key}":\n  • unknown setting key`)
        continue
      }
      // Deletion — allowed for any key defined in the schema.
      if (value === null) {
        continue
      }
      const result = zodSchema.safeParse(value)
      if (!result.success) {
        const flat = flattenZodIssues(result.error.issues).map((leaf) => ({
          path: leaf.path ? `${key}.${leaf.path}` : key,
          message: leaf.message,
        }))
        issues.push(...flat)
        summaries.push(`Setting "${key}":\n${summariseZodError(result.error)}`)
      }
    }
    if (issues.length === 0) {
      return
    }
    const message =
      issues.length === 1
        ? `Invalid setting value: ${issues[0]?.path} — ${issues[0]?.message}`
        : `Invalid settings patch (${issues.length} issues)\n${summaries.join(
            '\n',
          )}`
    throw new BadRequestException({
      message,
      details: { issues },
    })
  }

  private async readScopeValues(
    scope: 'user' | 'folder',
    scopeId: string,
    appId: string,
  ): Promise<Record<string, unknown>> {
    const rows =
      scope === 'user'
        ? await this.ormService.db
            .select({
              key: appCustomUserSettingsTable.key,
              value: appCustomUserSettingsTable.value,
            })
            .from(appCustomUserSettingsTable)
            .where(
              and(
                eq(appCustomUserSettingsTable.userId, scopeId),
                eq(appCustomUserSettingsTable.appId, appId),
              ),
            )
        : await this.ormService.db
            .select({
              key: appCustomFolderSettingsTable.key,
              value: appCustomFolderSettingsTable.value,
            })
            .from(appCustomFolderSettingsTable)
            .where(
              and(
                eq(appCustomFolderSettingsTable.folderId, scopeId),
                eq(appCustomFolderSettingsTable.appId, appId),
              ),
            )

    const values: Record<string, unknown> = {}
    for (const row of rows) {
      values[row.key] = row.value
    }
    return values
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

    const userValues = await this.readScopeValues('user', userId, app.id)
    const resolved = resolveCustomSettings(schema, userValues, undefined)

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

    const userValues = await this.readScopeValues('user', userId, app.id)
    const resolved = resolveCustomSettings(schema, userValues, undefined)
    return { values: resolved.values }
  }

  async patchUserCustomSettings(
    userId: string,
    app: App,
    patch: Record<string, unknown>,
  ): Promise<CustomSettingsGetResponse> {
    const settingsConfig = this.getSettingsConfig(app)
    const schema = settingsConfig?.user

    if (!schema) {
      throw new BadRequestException(
        'This app does not define user-level custom settings',
      )
    }

    this.validatePatchValues(schema, patch)

    await this.ormService.db.transaction(async (tx) => {
      const now = new Date()
      for (const [key, value] of Object.entries(patch)) {
        if (value === null) {
          await tx
            .delete(appCustomUserSettingsTable)
            .where(
              and(
                eq(appCustomUserSettingsTable.userId, userId),
                eq(appCustomUserSettingsTable.appId, app.id),
                eq(appCustomUserSettingsTable.key, key),
              ),
            )
        } else {
          await tx
            .insert(appCustomUserSettingsTable)
            .values({
              userId,
              appId: app.id,
              key,
              value,
              createdAt: now,
              updatedAt: now,
            })
            .onConflictDoUpdate({
              target: [
                appCustomUserSettingsTable.userId,
                appCustomUserSettingsTable.appId,
                appCustomUserSettingsTable.key,
              ],
              set: { value, updatedAt: now },
            })
        }
      }

      const [sizeRow] = await tx
        .select({
          total: sql<number>`coalesce(sum(octet_length(${appCustomUserSettingsTable.value}::text)), 0)::int`,
        })
        .from(appCustomUserSettingsTable)
        .where(
          and(
            eq(appCustomUserSettingsTable.userId, userId),
            eq(appCustomUserSettingsTable.appId, app.id),
          ),
        )
      if (sizeRow && sizeRow.total > MAX_VALUES_SIZE) {
        throw new BadRequestException(
          'Settings values exceed maximum size of 64KB',
        )
      }
    })

    this.broadcastUserSettingsChanged(userId, app)
    return this.getUserCustomSettings(userId, app)
  }

  async deleteUserCustomSettings(userId: string, app: App): Promise<void> {
    await this.ormService.db
      .delete(appCustomUserSettingsTable)
      .where(
        and(
          eq(appCustomUserSettingsTable.userId, userId),
          eq(appCustomUserSettingsTable.appId, app.id),
        ),
      )
    this.broadcastUserSettingsChanged(userId, app)
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

    const [userValues, folderValues] = await Promise.all([
      this.readScopeValues('user', userId, app.id),
      this.readScopeValues('folder', folderId, app.id),
    ])

    // For folder-level resolution, filter user values to only keys defined in
    // the folder schema (users may store unrelated keys).
    const userValuesForFolderSchema = this.filterValuesToSchema(
      userValues,
      schema,
    )

    const resolved: ResolvedCustomSettings = resolveCustomSettings(
      schema,
      userValuesForFolderSchema,
      folderValues,
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

  async patchFolderCustomSettings(
    folderId: string,
    app: App,
    patch: Record<string, unknown>,
  ): Promise<void> {
    const settingsConfig = this.getSettingsConfig(app)
    const schema = settingsConfig?.folder

    if (!schema) {
      throw new BadRequestException(
        'This app does not define folder-level custom settings',
      )
    }

    this.validatePatchValues(schema, patch)

    await this.ormService.db.transaction(async (tx) => {
      const now = new Date()
      for (const [key, value] of Object.entries(patch)) {
        if (value === null) {
          await tx
            .delete(appCustomFolderSettingsTable)
            .where(
              and(
                eq(appCustomFolderSettingsTable.folderId, folderId),
                eq(appCustomFolderSettingsTable.appId, app.id),
                eq(appCustomFolderSettingsTable.key, key),
              ),
            )
        } else {
          await tx
            .insert(appCustomFolderSettingsTable)
            .values({
              folderId,
              appId: app.id,
              key,
              value,
              createdAt: now,
              updatedAt: now,
            })
            .onConflictDoUpdate({
              target: [
                appCustomFolderSettingsTable.folderId,
                appCustomFolderSettingsTable.appId,
                appCustomFolderSettingsTable.key,
              ],
              set: { value, updatedAt: now },
            })
        }
      }

      const [sizeRow] = await tx
        .select({
          total: sql<number>`coalesce(sum(octet_length(${appCustomFolderSettingsTable.value}::text)), 0)::int`,
        })
        .from(appCustomFolderSettingsTable)
        .where(
          and(
            eq(appCustomFolderSettingsTable.folderId, folderId),
            eq(appCustomFolderSettingsTable.appId, app.id),
          ),
        )
      if (sizeRow && sizeRow.total > MAX_VALUES_SIZE) {
        throw new BadRequestException(
          'Settings values exceed maximum size of 64KB',
        )
      }
    })
  }

  async deleteFolderCustomSettings(folderId: string, app: App): Promise<void> {
    await this.ormService.db
      .delete(appCustomFolderSettingsTable)
      .where(
        and(
          eq(appCustomFolderSettingsTable.folderId, folderId),
          eq(appCustomFolderSettingsTable.appId, app.id),
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
