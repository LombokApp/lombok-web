import { RewriteFrames } from '@sentry/integrations'
import * as Sentry from '@sentry/node'
import * as Tracing from '@sentry/tracing'
import type Ajv from 'ajv'
import formatsPlugin from 'ajv-formats'
import cors from 'cors'
import express from 'express'
import type { OpenApiDocument } from 'express-openapi-validate'
import { OpenApiValidator } from 'express-openapi-validate'
import helmet from 'helmet'
import type http from 'http'
import type { LoggerModule } from 'i18next'
import i18next from 'i18next'
import I18NextFsBackend from 'i18next-fs-backend'
import type { AddressInfo } from 'net'
import { singleton } from 'tsyringe'

import { EnvConfigProvider } from './config/env-config.provider'
import { QueueName } from './constants/app-worker-constants'
import { IndexAllUnindexedInFolderProcessor } from './domains/folder/workers/index-all-unindexed-in-folder.worker'
import { IndexFolderProcessor } from './domains/folder/workers/index-folder.worker'
import { ExecuteUnstartedWorkProcessor } from './domains/folder-operation/workers/execute-unstarted-work.worker'
import { RouteNotFoundError } from './errors/app.error'
import { RegisterRoutes } from './generated/routes'
import { HealthManager } from './health/health-manager'
import { httpErrorMiddleware } from './middleware/http-error.middleware'
import { unhandledErrorMiddleware } from './middleware/unhandled-error.middleware'
import { validationErrorMiddleware } from './middleware/validation-error.middleware'
import { OrmService } from './orm/orm.service'
import { LoggingService } from './services/logging.service'
import { QueueService } from './services/queue.service'
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
    private readonly ormService: OrmService,
    private readonly loggingService: LoggingService,
    private readonly healthManager: HealthManager,
    private readonly socketService: SocketService,
    private readonly queueService: QueueService,
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
    await this.initRoutes()
    if (!this.config.getApiConfig().disable_http) {
      await this.listen()
      this.initSocketServer()
    }
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

  private async initRoutes() {
    const apiSpec = (await import('./generated/openapi.json'))
      .default as unknown as OpenApiDocument

    // TODO: Update terraform config to use /health instead of /api/health once
    // the risk of reporting unwanted unhealthy state is ruled out.
    this.app.get('/health', this.healthManager.requestHandler())
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

  private initSocketServer() {
    if (!this.server) {
      throw new Error('HTTP Server should be initialised before socket server.')
    }
    this.socketService.init(this.server)
  }

  private initWorkers() {
    const processors = [
      this.queueService.bindQueueProcessor(
        QueueName.IndexFolder,
        IndexFolderProcessor,
      ),
      this.queueService.bindQueueProcessor(
        QueueName.ExecuteUnstartedWork,
        ExecuteUnstartedWorkProcessor,
      ),
      this.queueService.bindQueueProcessor(
        QueueName.IndexAllUnindexedInFolder,
        IndexAllUnindexedInFolderProcessor,
      ),
    ]
    registerExitHandler(async () => {
      await Promise.all(processors.map((p) => p.close()))
    })
  }

  async listen() {
    if (this.closing) {
      return
    }

    const { port } = this.config.getApiConfig()

    const { logger } = this.loggingService

    return new Promise<void>((resolve) => {
      const server = this.app.listen(port, () => {
        const address = server.address() as AddressInfo
        logger.info(`👍👍👍👍👍👍👍👍👍👍👍👍👍👍👍👍👍👍👍👍👍`)
        logger.info(`API:  http://<whatever>:${address.port}/api/v1`)
        logger.info(`Docs: http://<whatever>:${address.port}/docs`)
        logger.info(`Websocket: http://<whatever>:${address.port}`)

        resolve()
        this.server = server
      })
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
