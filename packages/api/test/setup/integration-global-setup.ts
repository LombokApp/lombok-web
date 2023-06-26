import 'ts-node/register/transpile-only'
import 'reflect-metadata'

import { container } from 'tsyringe'

import { EnvConfigProvider } from '../../src/config/env-config.provider'
import { OrmService } from '../../src/orm/orm.service'

export default async () => {
  const ormService = container.resolve(OrmService)
  const configProvider = container.resolve(EnvConfigProvider)

  try {
    await ormService.init()

    const templateDbName = `${configProvider.getDbConfig().name}_test_template`

    const generator = ormService.orm.getSchemaGenerator()

    await generator.dropDatabase(templateDbName)
    await generator.createDatabase(templateDbName)

    ormService.orm.config.set('dbName', templateDbName)
    const driver = ormService.orm.em.getDriver()
    await driver.reconnect()
    await driver.execute(`CREATE EXTENSION citext;`)

    await ormService.orm.getMigrator().up()
  } finally {
    await ormService.close()
  }
}
