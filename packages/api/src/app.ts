import { RewriteFrames } from '@sentry/integrations'
import * as Sentry from '@sentry/node'
import * as Tracing from '@sentry/tracing'
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
import { injectIntoHead } from '@stellariscloud/utils'

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
  uiServer?: http.Server
  readonly app
  readonly uiApp

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

    this.uiApp = express()
    this.uiApp.disable('x-powered-by')

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
    await this.initApiRoutes()
    await this.initUIServer()
    if (!this.config.getApiConfig().disableHttp) {
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

  private async initUIServer() {
    this.uiApp.use(cors())
    this.uiApp.use(
      helmet({
        contentSecurityPolicy: {
          useDefaults: false,
          directives: {
            'default-src': "'self'",
            'frame-ancestors': ["'self'", 'stellariscloud.localhost:3000'],
            'script-src':
              "'sha256-mnquucvB/C4p9HEVErNfh1uhjqqNyuMG+NYhzk0XtAs='",
          },
        },
      }),
    )

    this.uiApp.use((req: Request, res: Response, next: NextFunction) => {
      if (!req.headers.host) {
        next()
        return
      }
      let host =
        'x-forwarded-host' in req.headers
          ? (req.headers['x-forwarded-host'] as string) ?? ''
          : req.headers.host.split(':')[0]
      const hostnameParts = host.split('.')
      const isModuleUIHost =
        hostnameParts.length === 5 && hostnameParts[2] === 'modules'
      const moduleName: string | undefined = isModuleUIHost
        ? hostnameParts[1]
        : undefined
      const uiId: string | undefined = isModuleUIHost
        ? hostnameParts[0]
        : undefined

      if (!moduleName || !uiId) {
        next()
        return
      }

      const SCRIPT_SRC = `
      // setup http interceptors to handle route config
      // provide core API
      console.log('Hello from the script!!')

      // setInterval(() => {
      //   const req = new XMLHttpRequest();
      //   req.addEventListener("load", (e) => {
      //     console.log('this.responseText:', e.target.responseText);
      //   });  
      //   req.open("GET", '/test.md');
      //   req.send();
      // }, 2000)
    `
      const INDEX_HTML = `<!DOCTYPE html><head><script>${SCRIPT_SRC}</script><link type="text/css" rel="stylesheet" href="/styles.css"></head><body>${moduleName}</body></html>`

      const CONTENT = {
        '/': INDEX_HTML,
        '/index.html': INDEX_HTML,
        '/styles.css': 'html { color: #999 }',
      }

      const HEADERS = {
        '/': {
          'Content-Type': 'text/html',
        },
        '/index.html': {
          'Content-Type': 'text/html',
        },
        '/styles.css': { 'Content-Type': 'text/css' },
      }

      const path = req.url.split('?')[0]
      console.log('host: %s - headers[path:"%s"]:', host, path, req.headers)
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition

      console.log('testing path[host:%s]:', host, path)
      if (path in CONTENT) {
        const returnContent = CONTENT[path as keyof typeof CONTENT]
        let response = res.status(200)
        const headers = HEADERS[path as keyof typeof HEADERS] ?? {}
        Object.keys(headers).forEach(
          (headerKey) =>
            (response = response.setHeader(
              headerKey,
              headers[headerKey as keyof typeof headers],
            )),
        )

        // .setHeader('Cross-Origin-Embedder-Policy', 'cross-origin')
        console.log('got response [%s]: ', typeof returnContent, returnContent)
        response.send(returnContent)
      }
    })
    this.uiApp.use(
      (
        req: express.Request,
        res: express.Response,
        next: express.NextFunction,
      ) => {
        res.status(404).send()
      },
    )
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

    const { port, uiServerPort, hostId } = this.config.getApiConfig()

    const { logger } = this.loggingService

    this.server = this.app.listen(port, () => {
      logger.info(`API 👍👍👍👍👍👍👍👍👍👍👍👍👍👍👍👍👍👍👍👍👍`)
      logger.info(`HTTP base:  ${hostId}:${port}/api/v1`)
      logger.info(`Websocket: ${hostId}:${port}`)
      logger.info(`Docs: ${hostId}:${port}/docs`)
    })
    this.uiServer = this.uiApp.listen(uiServerPort, () => {
      logger.info(`UI server 👍👍👍👍👍👍👍👍👍👍👍👍👍👍👍👍👍👍👍👍👍`)
      logger.info(
        `http://<module>.modules.stellariscloud.localhost:${uiServerPort}`,
      )
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
