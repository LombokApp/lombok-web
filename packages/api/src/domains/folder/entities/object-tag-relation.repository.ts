import { EntityRepository } from '@mikro-orm/core'
import { registry } from 'tsyringe'

import { getRepositoryInContext } from '../../../orm/orm.service'
import { ObjectTagRelation } from './object-tag-relation.entity'

@registry([
  {
    token: ObjectTagRelationRepository,
    useFactory: () => getRepositoryInContext(ObjectTagRelation),
  },
])
export class ObjectTagRelationRepository extends EntityRepository<ObjectTagRelation> {}
