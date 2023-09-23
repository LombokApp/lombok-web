import { EntityRepository } from '@mikro-orm/core'
import { registry } from 'tsyringe'

import { getRepositoryInContext } from '../../../orm/orm.service'
import { FolderOperationObject } from './folder-operation-object.entity'

@registry([
  {
    token: FolderOperationObjectRepository,
    useFactory: () => getRepositoryInContext(FolderOperationObject),
  },
])
export class FolderOperationObjectRepository extends EntityRepository<FolderOperationObject> {}
