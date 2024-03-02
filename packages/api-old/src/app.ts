import { RewriteFrames } from '@sentry/integrations'
import * as Sentry from '@sentry/node'
import * as Tracing from '@sentry/tracing'
import * as _coreWorker from '@stellariscloud/core-worker'
import type Ajv from 'ajv'
import formatsPlugin from 'ajv-formats'
import cors from 'cors'
import type { NextFunction, Request, Response } from 'express'
import express from 'express'
import type { OpenApiDocument } from 'express-openapi-validate'
import { OpenApiValidator } from 'express-openapi-validate'
import helmet from 'helmet'
import type http from 'http'
import type { LoggerModule } from 'i18next'
import i18next from 'i18next'
import I18NextFsBackend from 'i18next-fs-backend'
import mime from 'mime'
import * as redis from 'redis'
import { singleton } from 'tsyringe'

import { EnvConfigProvider } from './config/env-config.provider'
import { QueueName } from './constants/app-worker-constants'
import { NotifyPendingEventsProcessor } from './domains/event/workers/notify-pending-events.worker'
import { IndexFolderProcessor } from './domains/folder/workers/index-folder.worker'
import { ModuleService } from './domains/module/services/module.service'
import { RouteNotFoundError } from './errors/app.error'
import { RegisterRoutes } from './generated/routes'
import { HealthManager } from './health/health-manager'
import { httpErrorMiddleware } from './middleware/http-error.middleware'
import { unhandledErrorMiddleware } from './middleware/unhandled-error.middleware'
import { validationErrorMiddleware } from './middleware/validation-error.middleware'
import { OrmService } from './orm/orm.service'
import { CoreModuleService } from './services/core-module.service'
import { LoggingService } from './services/logging.service'
import { QueueService } from './services/queue.service'
import { RedisService } from './services/redis.service'
import { SocketService } from './services/socket.service'
import { stringifyLog } from './util/i18n.util'
import { registerExitHandler, runExitHandlers } from './util/process.util'
import { formats } from './util/validation.util'

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    export interface Request {
      swaggerDoc: any
    }
    export interface Response {
      /**
       * See https://github.com/getsentry/sentry-javascript/blob/5339751/packages/node/src/handlers.ts#L78
       */
      __sentry_transaction?: Tracing.Span

      /**
       * See https://github.com/getsentry/sentry-javascript/blob/5339751/packages/node/src/handlers.ts#L461
       */
      sentry?: string
    }
  }
}

// Declare global.__rootdir__ for Sentry
// See https://docs.sentry.io/platforms/node/typescript/#changing-events-frames
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace NodeJS {
    interface Global {
      __rootdir__: string
    }
  }
}

// eslint-disable-next-line no-extra-semi
;(global as any).__rootdir__ = __dirname || process.cwd()

@singleton()
export class App {
  closing = false
  server?: http.Server
  readonly app

  constructor(
    private readonly config: EnvConfigProvider,
    private readonly redisService: RedisService,
    private readonly ormService: OrmService,
    private readonly loggingService: LoggingService,
    private readonly healthManager: HealthManager,
    private readonly socketService: SocketService,
    private readonly queueService: QueueService,
    private readonly coreModuleService: CoreModuleService,
    private readonly moduleService: ModuleService,
  ) {
    this.app = express()
    this.app.disable('x-powered-by')

    Sentry.init({
      dsn: config.getLoggingConfig().sentryKey,
      environment: config.getLoggingConfig().sentryEnv,
      tracesSampleRate: 1.0,
      integrations: [
        /**
         * This integration attaches a global uncaught exception handler.
         *
         * See https://docs.sentry.io/platforms/node/configuration/integrations/default-integrations/#onuncaughtexception
         */
        new Sentry.Integrations.OnUncaughtException(),

        /**
         * This integration attaches a global unhandled rejection handler.
         *
         * See https://docs.sentry.io/platforms/node/configuration/integrations/default-integrations/#onunhandledrejection
         */
        new Sentry.Integrations.OnUnhandledRejection(),

        /**
         * This integration wraps http and https modules to capture all network
         * requests as breadcrumbs and/or tracing spans.
         *
         * See https://docs.sentry.io/platforms/node/configuration/integrations/default-integrations/#http
         */
        new Sentry.Integrations.Http({ tracing: true }),

        /**
         * This integration wraps all Express middleware in Sentry transactions.
         * `Sentry.Handlers.tracingHandler()` must be installed for this
         * integration.
         *
         * See https://docs.sentry.io/platforms/node/performance/
         * See https://docs.sentry.io/platforms/node/guides/express/#monitor-performance
         */
        new Tracing.Integrations.Express({ app: this.app }),

        new RewriteFrames({
          root: (global as any).__rootdir__,
        }),
      ],
    })
  }

  async init() {
    this.loggingService.logger.info('App init')
    await this.initI18n()
    await this.initOrm()
    this.initWorkers()

    // load any modules from disk
    await this.loadModulesFromDisk()

    await this.initUIServer()
    await this.initApiRoutes()

    if (!this.config.getApiConfig().disableHttp) {
      this.listen()
      this.initSocketServer()
    }
    this.initCoreModule()
  }

  private async initI18n() {
    const logger = this.loggingService.logger

    await i18next
      .use(I18NextFsBackend)
      .use<LoggerModule>({
        type: 'logger',
        log: (args) => logger.debug(stringifyLog(args)),
        warn: (args) => logger.warn(stringifyLog(args)),
        error: (args) => logger.error(stringifyLog(args)),
      })
      .init({
        initImmediate: true,
        debug: true,
        lng: 'en',
        fallbackLng: 'en',
        ns: ['translation', 'errors'],
        defaultNS: 'translation',
        backend: {
          loadPath: 'locales/{{lng}}/{{ns}}.json',
        },
      })
  }

  private async initOrm() {
    await this.ormService.init(true)
  }

  private async loadModulesFromDisk() {
    await this.moduleService.updateModulesFromDisk(
      this.config.getModulesConfig().modulesDirectory,
    )
  }

  private async initApiRoutes() {
    const apiSpec = (await import('./generated/openapi.json'))
      .default as unknown as OpenApiDocument

    this.app.get('/api/health', (req, res) => res.sendStatus(200))

    this.app.use(Sentry.Handlers.requestHandler())
    this.app.use(Sentry.Handlers.tracingHandler())
    this.app.use(this.loggingService.requestHandler())

    this.app.use(cors())
    this.app.use(
      helmet({
        contentSecurityPolicy: {
          useDefaults: true,
        },
      }),
    )

    this.app.use(express.json({ limit: '5mb' }))

    const validator = new OpenApiValidator(apiSpec, {
      ajvOptions: {
        // Add custom validation formats
        formats,

        // Return all - not only the first validation error
        allErrors: true,

        // Add line breaks to the runtime-generated validator functions
        code: { lines: true },

        // Silence warnings about invalid JSON Schema in the generated API spec
        strict: false,

        // These options are set to make AJV behave in a similar way to the
        // bespoke `ValidationService` (that we have disabled) from TSOA.
        // See https://ajv.js.org/guide/modifying-data.html#modifying-data-during-validation
        removeAdditional: true,
        useDefaults: true,
        // Support parsing single query parameter values as arrays
        coerceTypes: 'array',
      },
    })

    formatsPlugin(validator['_ajv'] as Ajv)
    RegisterRoutes(this.app, validator)

    this.app.use(this.loggingService.errorHandler())
    this.app.use(validationErrorMiddleware())
    this.app.use(
      (
        req: express.Request,
        res: express.Response,
        next: express.NextFunction,
      ) => next(new RouteNotFoundError()),
    )
    this.app.use(httpErrorMiddleware(this.loggingService))
    this.app.use(Sentry.Handlers.errorHandler())
    this.app.use(unhandledErrorMiddleware(this.loggingService))
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  private async initUIServer() {
    this.app.use((req: Request, res: Response, next: NextFunction) => {
      if (!req.headers.host) {
        next()
        return
      }
      const host =
        'x-forwarded-host' in req.headers
          ? (req.headers['x-forwarded-host'] as string | undefined) ?? ''
          : req.headers.host.split(':')[0]
      const hostnameParts = host.split('.')
      const isModuleUIHost =
        hostnameParts.length === 5 && hostnameParts[2] === 'modules'
      const moduleName: string | undefined = isModuleUIHost
        ? hostnameParts[1]
        : undefined
      const uiName: string | undefined = isModuleUIHost
        ? hostnameParts[0]
        : undefined
      const resolvedContentPath = req.path === '/' ? '/index.html' : req.path
      if (!moduleName || !uiName) {
        next()
        return
      }

      const REDIS_KEY = `MODULE_UI:${moduleName}:${uiName}:${resolvedContentPath}`
      const mimeType = mime.getType(resolvedContentPath) ?? 'text/html'
      void this.redisService.client
        .GET(redis.commandOptions({ returnBuffers: true }), REDIS_KEY)
        .then((returnContent) => {
          if (returnContent) {
            console.log(
              '"%s" got response [%s] %d bytes',
              resolvedContentPath,
              mimeType,
              returnContent.length,
            )
            return res
              .setHeader('content-type', mimeType)
              .setHeader('Cross-Origin-Embedder-Policy', 'cross-origin')
              .send(returnContent)
              .status(200)
          } else {
            return res
              .setHeader('Cross-Origin-Embedder-Policy', 'cross-origin')
              .sendStatus(404)
          }
        })
    })
  }

  private initSocketServer() {
    if (!this.server) {
      throw new Error('HTTP Server should be initialised before socket server.')
    }
    this.socketService.init(this.server)
  }

  private initCoreModule() {
    this.coreModuleService.startCoreModuleThread(
      'embedded_core_module_worker__1',
    )
  }

  private initWorkers() {
    const processors = [
      this.queueService.bindQueueProcessor(
        QueueName.IndexFolder,
        IndexFolderProcessor,
      ),
      this.queueService.bindQueueProcessor(
        QueueName.NotifyPendingEvents,
        NotifyPendingEventsProcessor,
      ),
    ]

    // naive repeating job to get event handling going
    void this.queueService.queues[QueueName.NotifyPendingEvents].add(
      QueueName.NotifyPendingEvents,
      undefined,
      {
        repeat: {
          every: 5000,
        },
      },
    )
    registerExitHandler(async () => {
      await Promise.all(processors.map((p) => p.close()))
    })
  }

  listen() {
    if (this.closing) {
      return
    }

    const { port, hostId } = this.config.getApiConfig()

    const { logger } = this.loggingService

    this.server = this.app.listen(port, () => {
      logger.info(`API 👍👍👍👍👍👍👍👍👍👍👍👍👍👍👍👍👍👍👍👍👍`)
      logger.info(`HTTP base:  ${hostId}:${port}/api/v1`)
      logger.info(`Websocket: ${hostId}:${port}`)
      logger.info(`Docs: ${hostId}:${port}/docs`)
      logger.info(`http://<uiName>.<module>.modules.stellariscloud.localhost`)
    })
  }

  async close() {
    this.closing = true

    await runExitHandlers()
    if (this.server) {
      this.server.close()
    }
    this.socketService.close()
  }
}
