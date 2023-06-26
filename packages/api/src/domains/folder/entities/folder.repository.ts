import { EntityRepository } from '@mikro-orm/postgresql'
import { registry } from 'tsyringe'

import { getRepositoryInContext } from '../../../orm/orm.service'
import { Folder } from './folder.entity'
import { FolderObject } from './folder-object.entity'

@registry([
  {
    token: FolderRepository,
    useFactory: () => getRepositoryInContext(Folder),
  },
])
export class FolderRepository extends EntityRepository<Folder> {
  async getFolderMetadata(folderId: string) {
    return this.getEntityManager()
      .qb(FolderObject)
      .select([
        'count(*) as total_count',
        'sum(size_bytes) as total_size_bytes',
      ])
      .where({ folder: folderId })
      .execute<{ total_count: string | null; total_size_bytes: string | null }>(
        'get',
        false,
      )
      .then((r) => ({
        totalCount: r.total_count ? parseInt(r.total_count, 10) : 0,
        totalSizeBytes: r.total_size_bytes
          ? parseInt(r.total_size_bytes, 10)
          : 0,
      }))
  }
}
