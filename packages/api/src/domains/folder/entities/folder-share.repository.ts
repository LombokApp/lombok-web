import { EntityRepository } from '@mikro-orm/core'
import { registry } from 'tsyringe'

import { getRepositoryInContext } from '../../../orm/orm.service'
import { FolderShare } from './folder-share.entity'

@registry([
  {
    token: FolderShareRepository,
    useFactory: () => getRepositoryInContext(FolderShare),
  },
])
export class FolderShareRepository extends EntityRepository<FolderShare> {}
