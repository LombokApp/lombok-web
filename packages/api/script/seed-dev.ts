import 'reflect-metadata'

import { RequestContext } from '@mikro-orm/core'
import { container, injectable } from 'tsyringe'

import { EnvConfigProvider } from '../src/config/env-config.provider'
import { PlatformRole } from '../src/domains/auth/constants/role.constants'
import { UserStatus } from '../src/domains/user/constants/user.constants'
import { UserRepository } from '../src/domains/user/entities/user.repository'
import { resolveDependency } from '../src/ioc'
import { OrmService } from '../src/orm/orm.service'

@injectable()
class Seeder {
  private readonly seedConfig: EnvConfigProvider['dbSeed'] =
    this.configProvider.getDbSeedConfig()

  constructor(
    private readonly ormService: OrmService,
    private readonly configProvider: EnvConfigProvider,
  ) {}

  async createUser(userRepository: UserRepository) {
    const userId = '6edd317d-9af8-42e3-9f0c-99cf027a1262'
    const user = userRepository.create({
      id: userId,
      role: PlatformRole.Authenticated,
      status: UserStatus.Active,
      email: 'steven@peertjelabs.nl',
      emailVerified: false,
    })
    await userRepository.getEntityManager().flush()
    return user
  }

  async seed() {
    await this.ormService.init()
    const em = this.ormService.forkEntityManager()
    await RequestContext.createAsync(em, async () => {
      const userRepository: UserRepository = container.resolve(UserRepository)
      await this.createUser(userRepository)
      await em.flush()
    })
    void this.ormService.orm.close(true)
    void this.ormService.close()
  }
}

void resolveDependency(Seeder)
  .seed()
  .then(() => process.exit(0))
