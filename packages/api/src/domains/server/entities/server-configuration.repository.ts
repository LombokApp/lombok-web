import { EntityRepository } from '@mikro-orm/core'
import { registry } from 'tsyringe'

import { getRepositoryInContext } from '../../../orm/orm.service'
import { ServerConfiguration } from './server-configuration.entity'

@registry([
  {
    token: ServerConfigurationRepository,
    useFactory: () => getRepositoryInContext(ServerConfiguration),
  },
])
export class ServerConfigurationRepository extends EntityRepository<ServerConfiguration> {}
