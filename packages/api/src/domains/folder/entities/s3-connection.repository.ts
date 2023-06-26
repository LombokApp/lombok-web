import { EntityRepository } from '@mikro-orm/core'
import { registry } from 'tsyringe'

import { getRepositoryInContext } from '../../../orm/orm.service'
import { S3Connection } from './s3-connection.entity'

@registry([
  {
    token: S3ConnectionRepository,
    useFactory: () => getRepositoryInContext(S3Connection),
  },
])
export class S3ConnectionRepository extends EntityRepository<S3Connection> {}
