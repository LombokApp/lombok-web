import { EntityRepository } from '@mikro-orm/core'
import { registry } from 'tsyringe'

import { getRepositoryInContext } from '../../../orm/orm.service'
import { EmailAuthenticationKey } from './email-authentication-key.entity'

@registry([
  {
    token: EmailAuthenticationKeyRepository,
    useFactory: () => getRepositoryInContext(EmailAuthenticationKey),
  },
])
export class EmailAuthenticationKeyRepository extends EntityRepository<EmailAuthenticationKey> {}
