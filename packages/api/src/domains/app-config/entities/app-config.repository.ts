import { EntityRepository } from '@mikro-orm/core'
import { registry } from 'tsyringe'

import { getRepositoryInContext } from '../../../orm/orm.service'
import { AppConfig } from './app-config.entity'

@registry([
  {
    token: AppConfigRepository,
    useFactory: () => getRepositoryInContext(AppConfig),
  },
])
export class AppConfigRepository extends EntityRepository<AppConfig> {}
