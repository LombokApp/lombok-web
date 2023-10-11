import { EntityRepository } from '@mikro-orm/core'
import { registry } from 'tsyringe'

import { getRepositoryInContext } from '../../../orm/orm.service'
import { S3Location } from './s3-location.entity'

@registry([
  {
    token: S3LocationRepository,
    useFactory: () => getRepositoryInContext(S3Location),
  },
])
export class S3LocationRepository extends EntityRepository<S3Location> {}
