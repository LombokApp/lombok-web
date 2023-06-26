import { EntityRepository } from '@mikro-orm/core'
import { registry } from 'tsyringe'

import { getRepositoryInContext } from '../../../orm/orm.service'
import { FolderObject } from './folder-object.entity'

@registry([
  {
    token: FolderObjectRepository,
    useFactory: () => getRepositoryInContext(FolderObject),
  },
])
export class FolderObjectRepository extends EntityRepository<FolderObject> {}
