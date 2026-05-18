import type { RegisterableTriggerConfig } from '@lombokapp/types'
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { and, eq, sql } from 'drizzle-orm'
import { OrmService } from 'src/orm/orm.service'
import { v4 as uuidV4 } from 'uuid'

import { appsTable } from '../entities/app.entity'
import {
  AppRuntimeTrigger,
  appRuntimeTriggersTable,
} from '../entities/app-runtime-trigger.entity'

export interface ListedAppRuntimeTrigger {
  id: string
  kind: 'event' | 'schedule'
  definition: RegisterableTriggerConfig
}

@Injectable()
export class AppRuntimeTriggerService {
  constructor(private readonly ormService: OrmService) {}

  private async resolveApp(requestingAppIdentifier: string) {
    // Inlined to avoid an AppService dep — AppService imports back into this
    // module for the socket handler, and a Nest forwardRef pair around the
    // decorator metadata trips on circular module init.
    const app = await this.ormService.db.query.appsTable.findFirst({
      where: eq(appsTable.identifier, requestingAppIdentifier),
    })
    if (!app) {
      throw new NotFoundException(`App not found: ${requestingAppIdentifier}`)
    }
    return app
  }

  async register(
    requestingAppIdentifier: string,
    trigger: RegisterableTriggerConfig,
  ): Promise<{ triggerId: string }> {
    const app = await this.resolveApp(requestingAppIdentifier)

    // Mirror the cross-field rules appConfigSchema.superRefine enforces for
    // config triggers (packages/types/src/apps.types.ts:719-751).
    const taskExists = (app.config.tasks ?? []).some(
      (t) => t.identifier === trigger.taskIdentifier,
    )
    if (!taskExists) {
      throw new BadRequestException({
        code: 'UNKNOWN_TASK',
        message: `Unknown task "${trigger.taskIdentifier}". Must be one of the app's declared tasks.`,
      })
    }

    if (trigger.kind === 'event') {
      const isCoreEvent = trigger.eventIdentifier.startsWith('core:')
      if (
        isCoreEvent &&
        !app.subscribedCoreEvents.includes(trigger.eventIdentifier)
      ) {
        throw new BadRequestException({
          code: 'EVENT_NOT_SUBSCRIBED',
          message: `Platform event "${trigger.eventIdentifier}" is not in the app's subscribedCoreEvents.`,
        })
      }
    }

    // Cross-source triggerKey uniqueness: the DB unique index covers
    // runtime-vs-runtime, but config-declared triggers live in
    // apps.config.triggers (JSONB) and aren't in this table. Schedule
    // triggers always have a key; event triggers may opt in.
    if (trigger.triggerKey) {
      const configCollision = (app.config.triggers ?? []).some(
        (t) =>
          (t.kind === 'schedule' || t.kind === 'event') &&
          t.triggerKey === trigger.triggerKey,
      )
      if (configCollision) {
        throw new ConflictException({
          code: 'TRIGGER_KEY_TAKEN',
          message: `triggerKey "${trigger.triggerKey}" already used by a config-declared trigger.`,
        })
      }
    }

    const now = new Date()
    const triggerId = uuidV4()
    try {
      await this.ormService.db.insert(appRuntimeTriggersTable).values({
        id: triggerId,
        appId: app.id,
        definition: trigger,
        createdAt: now,
        updatedAt: now,
      })
    } catch (error) {
      // Drizzle wraps pg errors: the SQLSTATE lives on `error.cause.code`.
      const pgCode =
        (error as { code?: string } | null | undefined)?.code ??
        (error as { cause?: { code?: string } } | null | undefined)?.cause?.code
      if (pgCode === '23505') {
        throw new ConflictException({
          code: 'TRIGGER_KEY_TAKEN',
          message: `triggerKey already registered for this app.`,
        })
      }
      throw error
    }

    return { triggerId }
  }

  async unregister(
    requestingAppIdentifier: string,
    triggerId: string,
  ): Promise<{ success: boolean }> {
    const app = await this.resolveApp(requestingAppIdentifier)

    const result = await this.ormService.db
      .delete(appRuntimeTriggersTable)
      .where(
        and(
          eq(appRuntimeTriggersTable.id, triggerId),
          eq(appRuntimeTriggersTable.appId, app.id),
        ),
      )
      .returning({ id: appRuntimeTriggersTable.id })

    if (result.length === 0) {
      throw new NotFoundException(`Trigger not found: ${triggerId}`)
    }

    return { success: true }
  }

  async list(
    requestingAppIdentifier: string,
    options: { kind?: 'event' | 'schedule' } = {},
  ): Promise<ListedAppRuntimeTrigger[]> {
    const app = await this.resolveApp(requestingAppIdentifier)

    const where = options.kind
      ? and(
          eq(appRuntimeTriggersTable.appId, app.id),
          sql`(${appRuntimeTriggersTable.definition} ->> 'kind') = ${options.kind}`,
        )
      : eq(appRuntimeTriggersTable.appId, app.id)

    const rows =
      await this.ormService.db.query.appRuntimeTriggersTable.findMany({ where })

    return rows.map((row: AppRuntimeTrigger) => ({
      id: row.id,
      kind: row.definition.kind,
      definition: row.definition,
    }))
  }
}
