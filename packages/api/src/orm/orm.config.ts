import type { Options } from '@mikro-orm/core'
import { LoadStrategy } from '@mikro-orm/core'
import type { PostgreSqlDriver } from '@mikro-orm/postgresql'
import { TsMorphMetadataProvider } from '@mikro-orm/reflection'
import { SqlHighlighter } from '@mikro-orm/sql-highlighter'
import path from 'path'

import type { ConfigProvider } from '../config/config.interface'
import { LOG_LEVELS, LogLevel } from '../constants/logging.constants'
import type { LoggingService } from '../services/logging.service'
import { loadMigrations } from '../util/orm.util'

const MIGRATION_DIR = path.join(__dirname, 'migrations')
const MIGRATION_PATTERN = 'Migration+([0-9]).{t,j}s'

export const getConfig = async (
  configProvider: ConfigProvider,
  loggingService: LoggingService,
) => {
  const { host, port, name, password, user } = configProvider.getDbConfig()
  const { level } = configProvider.getLoggingConfig()

  const options: Options<PostgreSqlDriver> = {
    metadataProvider: TsMorphMetadataProvider,
    highlighter: new SqlHighlighter(),
    type: 'postgresql',
    entities: ['./dist/**/*.entity.js'],
    entitiesTs: ['./src/**/*.entity.ts'],
    migrations: {
      path: MIGRATION_DIR,
      allOrNothing: true,
      disableForeignKeys: false,
      migrationsList: await loadMigrations(MIGRATION_DIR, MIGRATION_PATTERN),
    },
    cache: {
      pretty: true,
      options: {
        cacheDir: '.orm-cache',
      },
    },
    // See https://mikro-orm.io/docs/filters/#filters-and-populating-of-relationships
    loadStrategy: LoadStrategy.JOINED,
    host,
    port,
    dbName: name,
    password,
    user,
    debug: LOG_LEVELS[level] >= LOG_LEVELS[LogLevel.Warn],
    logger: (message) => {
      loggingService.logger.debug(message)
    },
  }

  return options
}
