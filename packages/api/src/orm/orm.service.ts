import type {
  AnyEntity,
  EntityName,
  EntityRepository,
  GetRepository,
} from '@mikro-orm/core'
import { MikroORM, RequestContext } from '@mikro-orm/core'
import type { PostgreSqlDriver } from '@mikro-orm/postgresql'
import type { NextFunction, Request, Response } from 'express'
import { singleton } from 'tsyringe'

import { EnvConfigProvider } from '../config/env-config.provider'
import { HealthManager } from '../health/health-manager'
import { LoggingService } from '../services/logging.service'
import { getConfig } from './orm.config'

export const getRepositoryInContext = <
  T extends AnyEntity<T>,
  U extends EntityRepository<T> = EntityRepository<T>,
>(
  entityName: EntityName<T>,
): GetRepository<T, U> => {
  const em = RequestContext.getEntityManager()
  if (!em) {
    throw new Error('Could not get em from existing context.')
  }
  return em.getRepository(entityName)
}

@singleton()
export class OrmService {
  constructor(
    private readonly configProvider: EnvConfigProvider,
    private readonly loggingService: LoggingService,
    private readonly healthManager: HealthManager,
  ) {}

  private _ok = false

  private _init?: Promise<void>
  private _orm?: MikroORM<PostgreSqlDriver>

  get orm(): MikroORM<PostgreSqlDriver> {
    if (!this._orm) {
      throw new Error('OrmService is not initialized')
    }
    return this._orm
  }

  async init() {
    if (!this._init) {
      this.healthManager.register('db', this)
      this._init = getConfig(this.configProvider, this.loggingService).then(
        (config) =>
          MikroORM.init<PostgreSqlDriver>({
            ...config,
            logger: (message) => this.loggingService.logger.debug(message),
            // eslint-disable-next-line promise/no-nesting
          }).then((orm) => {
            this._ok = true
            this._orm = orm
          }),
      )
    }

    return this._init
  }

  healthState() {
    return { ok: this._ok }
  }

  async runMigrations() {
    if (this.configProvider.getDbConfig().runMigrations) {
      const executed = await this.orm.getMigrator().getExecutedMigrations()

      executed.forEach((migration) => {
        this.loggingService.logger.info(
          `previously executed migration: ${
            migration.name
          } ${migration.executed_at.toISOString()}`,
        )
      })

      const pending = await this.orm.getMigrator().getPendingMigrations()

      pending.forEach((migration) => {
        this.loggingService.logger.info(
          `found pending migration: ${migration.path}`,
        )
      })
      this.loggingService.logger.info(
        `migrations enabled, running ${pending.length} migration${
          pending.length === 1 ? '' : 's'
        }`,
      )

      await this.orm.getMigrator().up()
    } else {
      this.loggingService.logger.info('migrations disabled, skipping all')
    }
  }

  forkEntityManager() {
    return this.orm.em.fork({ clear: true })
  }

  requestHandler() {
    return (_: Request, __: Response, next: NextFunction) => {
      RequestContext.create(this.orm.em, next)
    }
  }

  runInContextFp<R, A extends any[] = []>(
    callback: (...args: A) => R,
    params: A | undefined = undefined,
  ) {
    RequestContext.create(this.orm.em, () =>
      callback.apply(this, params ?? ([] as unknown as A)),
    )
  }

  runInAsyncContextFp<R, A extends any[] = []>(
    callback: (...args: A) => Promise<R>,
    params: A | undefined = undefined,
  ) {
    return (async (...args: A) => {
      return RequestContext.createAsync(this.orm.em, async () => {
        return callback(...args)
      })
    }).apply(this, params ?? ([] as unknown as A))
  }

  async close() {
    if (!this._init) {
      return
    }
    await this._init
    await this.orm.close()
  }
}
