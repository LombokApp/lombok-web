import { EntityRepository } from '@mikro-orm/core'
import { registry } from 'tsyringe'

import { getRepositoryInContext } from '../../../orm/orm.service'
import { ApiKey } from './api-key.entity'

@registry([
  {
    token: ApiKeyRepository,
    useFactory: () => getRepositoryInContext(ApiKey),
  },
])
export class ApiKeyRepository extends EntityRepository<ApiKey> {}
