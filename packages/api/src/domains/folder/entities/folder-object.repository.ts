import { EntityRepository } from '@mikro-orm/postgresql' // or any other driver package
import { registry } from 'tsyringe'

import { getRepositoryInContext } from '../../../orm/orm.service'
import { FolderObject } from './folder-object.entity'

@registry([
  {
    token: FolderObjectRepository,
    useFactory: () => getRepositoryInContext(FolderObject),
  },
])
export class FolderObjectRepository extends EntityRepository<FolderObject> {
  async listUnindexedFolderObjects(
    folderId: string,
    limit: number = 100,
  ): Promise<FolderObject[]> {

    const qb = this.qb('fo')

    const results = await qb
      .select(['*'])
      .leftJoin('operations', 'fop', {
        'fop.operation_name': 'IndexFolderObject',
        'f1.operation_relation_type': 'INPUT',
      })
      .where({
        folder: folderId,
        hash: null,
        'fop.operation_name': null,
      })
      .groupBy('fo.id')
      .limit(limit)
    return results
  }
}
