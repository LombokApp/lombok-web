import { EntityRepository } from '@mikro-orm/core'
import { registry } from 'tsyringe'

import { getRepositoryInContext } from '../../../orm/orm.service'
import { ObjectTag } from './object-tag.entity'

@registry([
  {
    token: ObjectTagRepository,
    useFactory: () => getRepositoryInContext(ObjectTag),
  },
])
export class ObjectTagRepository extends EntityRepository<ObjectTag> {}
