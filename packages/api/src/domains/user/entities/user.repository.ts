import { EntityRepository } from '@mikro-orm/core'
import { registry } from 'tsyringe'

import { getRepositoryInContext } from '../../../orm/orm.service'
import { User } from './user.entity'

@registry([
  {
    token: UserRepository,
    useFactory: () => getRepositoryInContext(User),
  },
])
export class UserRepository extends EntityRepository<User> {}
