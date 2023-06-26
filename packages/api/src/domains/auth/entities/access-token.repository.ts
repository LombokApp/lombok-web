import { EntityRepository } from '@mikro-orm/core'
import { registry } from 'tsyringe'

import { getRepositoryInContext } from '../../../orm/orm.service'
import { AccessToken } from './access-token.entity'

@registry([
  {
    token: AccessTokenRepository,
    useFactory: () => getRepositoryInContext(AccessToken),
  },
])
export class AccessTokenRepository extends EntityRepository<AccessToken> {}
