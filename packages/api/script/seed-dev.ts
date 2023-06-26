import 'reflect-metadata'

import { RequestContext } from '@mikro-orm/core'
import { MediaType } from '@stellariscloud/utils'
import { container, injectable } from 'tsyringe'

import { EnvConfigProvider } from '../src/config/env-config.provider'
import { PlatformRole } from '../src/domains/auth/constants/role.constants'
import { FolderRepository } from '../src/domains/folder/entities/folder.repository'
import { FolderObjectRepository } from '../src/domains/folder/entities/folder-object.repository'
import { S3ConnectionRepository } from '../src/domains/folder/entities/s3-connection.repository'
import { UserStatus } from '../src/domains/user/constants/user.constants'
import type { User } from '../src/domains/user/entities/user.entity'
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
      username: 'User1',
      email: 'steven@peertjelabs.nl',
    })
    await userRepository.getEntityManager().flush()
    return user
  }

  async createFolder(
    user: User,
    folderName: string,
    folderRepository: FolderRepository,
  ) {
    const folder = folderRepository.create({
      name: folderName,
      bucket: this.seedConfig?.demoS3Bucket ?? '',
      // prefix: ???,
      accessKeyId: this.seedConfig?.demoS3AccessKeyId ?? '',
      secretAccessKey: this.seedConfig?.demoS3SecretAccessKey ?? '',
      endpoint: this.seedConfig?.demoS3Endpoint ?? '',
      region: this.seedConfig?.demoS3Region ?? '',
      owner: user.id,
    })

    await folderRepository.getEntityManager().flush()

    return folder
  }

  async createS3Connection(
    userId: string,
    s3ConnectionRepository: S3ConnectionRepository,
  ) {
    const now = new Date()
    const s3Connection = s3ConnectionRepository.create({
      name: 'MY S3 Connection',
      accessKeyId: this.seedConfig?.demoS3AccessKeyId ?? '',
      secretAccessKey: this.seedConfig?.demoS3SecretAccessKey ?? '',
      endpoint: this.seedConfig?.demoS3Endpoint ?? '',
      region: this.seedConfig?.demoS3Region ?? 'auto',
      owner: userId,
      createdAt: now,
      updatedAt: now,
    })

    await s3ConnectionRepository.getEntityManager().flush()

    return s3Connection
  }
  async createFolderObject(
    folderId: string,
    objectKey: string,
    folderObjectRepository: FolderObjectRepository,
  ) {
    const now = new Date()
    const folderObject = folderObjectRepository.create({
      folder: folderId,
      objectKey,
      mediaType: MediaType.Unknown,
      sizeBytes: 10247,
      eTag: '',
      lastModified: 0,
      createdAt: now,
      updatedAt: now,
    })

    await folderObjectRepository.getEntityManager().flush()

    return folderObject
  }

  async seed() {
    await this.ormService.init()
    const em = this.ormService.forkEntityManager()
    await RequestContext.createAsync(em, async () => {
      const userRepository: UserRepository = container.resolve(UserRepository)
      const folderRepository: FolderRepository =
        container.resolve(FolderRepository)
      const s3ConnectionRepository: S3ConnectionRepository = container.resolve(
        S3ConnectionRepository,
      )
      const folderObjectRepository: FolderObjectRepository = container.resolve(
        FolderObjectRepository,
      )

      const user = await this.createUser(userRepository)
      const _s3Connection = await this.createS3Connection(
        user.id,
        s3ConnectionRepository,
      )
      const _folder = await this.createFolder(
        user,
        'My folder',
        folderRepository,
      )
      await this.createFolderObject(
        _folder.id,
        'test.png',
        folderObjectRepository,
      )
      await em.flush()
    })
    void this.ormService.orm.close(true)
    void this.ormService.close()
  }
}

void resolveDependency(Seeder)
  .seed()
  .then(() => process.exit(0))
