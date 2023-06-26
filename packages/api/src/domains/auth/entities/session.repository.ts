import { EntityRepository } from '@mikro-orm/core'
import { registry } from 'tsyringe'

import { getRepositoryInContext } from '../../../orm/orm.service'
import { Session } from './session.entity'

@registry([
  {
    token: SessionRepository,
    useFactory: () => getRepositoryInContext(Session),
  },
])
export class SessionRepository extends EntityRepository<Session> {}
