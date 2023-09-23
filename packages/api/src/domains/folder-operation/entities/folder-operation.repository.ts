import { EntityRepository } from '@mikro-orm/core'
import { registry } from 'tsyringe'

import { getRepositoryInContext } from '../../../orm/orm.service'
import { FolderOperation } from './folder-operation.entity'

@registry([
  {
    token: FolderOperationRepository,
    useFactory: () => getRepositoryInContext(FolderOperation),
  },
])
export class FolderOperationRepository extends EntityRepository<FolderOperation> {}
