import * as Sentry from '@sentry/node'
import { randomBytes } from 'crypto'
import IORedis from 'ioredis'
import { singleton } from 'tsyringe'

import { EnvConfigProvider } from '../config/env-config.provider'
import { HealthManager } from '../health/health-manager'
import { LoggingService } from './logging.service'

export class RedisConnection extends IORedis {
  // static count = new Map<string, number>()
  static connections = new Map<string, RedisConnection>()

  private _retryCount = 0

  static getConnection(
    _name: string,
    _healthManager: HealthManager,
    _critical: boolean,
    _maxRetries: number | undefined,
    options: IORedis.RedisOptions & {},
  ): RedisConnection {
    const _key = `redis:${_name}`

    if (!RedisConnection.connections.get(_key)) {
      const connection = new RedisConnection({
        // Recommended `reconnectOnError` configuration when using AWS ElastiCache
        // See https://github.com/luin/ioredis#reconnect-on-error.
        reconnectOnError: (error: Error) => {
          if (error.message.includes('READONLY')) {
            return 2
          }
          return false
        },
        retryStrategy: (times) => {
          if (_maxRetries !== undefined && times > _maxRetries) {
            return null
          }

          connection._retryCount = times
          return Math.min(times * 50, 2000)
        },
        ...options,
        maxRetriesPerRequest: null,
        enableReadyCheck: false,
      })

      RedisConnection.connections.set(_key, connection)

      _healthManager.register(_key, {
        healthState: () => {
          let ok = true

          if (_critical) {
            // See https://github.com/luin/ioredis#connection-events for a list of
            // and description of each status.
            switch (connection.status) {
              case 'connect':
              case 'ready':
              case 'wait':
              case 'reconnecting':
              case 'close':
                ok = true
                break
              case 'error':
                // TODO: We may want to return ok in this case depending on whether
                // or not the state rests in `reconnecting` or `error` during the
                // interval between reconnect attempts.
                ok = false
                break
              case 'end':
                ok = false
                break
              default:
                // We assume that any unexpected status values represent an ok state
                // it's better to do this than to force a transition to unhealthy
                // and possibly a container restart.
                Sentry.captureMessage(
                  `Unexpected ioredis status ${connection.status}`,
                  Sentry.Severity.Warning,
                )
            }
          }

          return {
            ok,
            meta: {
              status: connection.status,
              retryCount: connection._retryCount,
            },
          }
        },
      })
    }

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return RedisConnection.connections.get(_key)!
  }

  // quit() {
  //   this._healthManager.remove(this._key)
  //   return super.quit()
  // }

  duplicate(_options?: IORedis.RedisOptions) {
    return this
  }
}

@singleton()
export class RedisService {
  private readonly defaultConnection: RedisConnection =
    this.getConnection('default')

  constructor(
    private readonly config: EnvConfigProvider,
    private readonly healthManager: HealthManager,
    private readonly loggingService: LoggingService,
  ) {}

  get connection() {
    return this.defaultConnection
  }

  getConnection(name: string, critical = true): RedisConnection {
    const { host, port, maxRetries } = this.config.getRedisConfig()

    return RedisConnection.getConnection(
      name,
      this.healthManager,
      critical,
      maxRetries,
      {
        host,
        port,
      },
    )
  }

  // lock creates a distributed lock and returns whether a lock exists
  // or not.
  public async lock(name: string, timeoutMs: number): Promise<boolean> {
    const exists = await this.connection.get(name)
    if (exists) {
      return false
    }

    const randomValue = randomBytes(64).toString('hex')
    await this.connection.psetex(name, timeoutMs, randomValue)
    return true
  }

  public async unlock(name: string) {
    const exists = await this.connection.get(name)
    if (exists) {
      await this.connection.del(name)
    }
  }

  public async close() {
    await this.connection.quit()
    for (const [key, value] of RedisConnection.connections.entries()) {
      this.loggingService.logger.debug(`closing redis connection: ${key}`)
      try {
        await value.quit()
      } catch (e: any) {
        if (e.message !== 'Connection is closed.') {
          this.loggingService.logger.error('another error:', e)
          // throw e
        }
      }
    }
  }
}
