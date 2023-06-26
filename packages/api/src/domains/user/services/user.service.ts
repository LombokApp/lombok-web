import { parseSort } from '@stellariscloud/utils'
import { Lifecycle, scoped } from 'tsyringe'

import type { PlatformRole } from '../../auth/constants/role.constants'
import { ApiKeyRepository } from '../../auth/entities/api-key.repository'
import { ApiKeyNotFoundError } from '../../auth/errors/api-key.error'
import { AccessTokenService } from '../../auth/services/access-token.service'
import type { UserStatus } from '../constants/user.constants'
import { UserRepository } from '../entities/user.repository'
import { UserNotFoundError } from '../errors/user.error'

export enum UserSort {
  CreatedAtAsc = 'createdAt-asc',
  CreatedAtDesc = 'createdAt-desc',
  EmailAsc = 'email-asc',
  EmailDesc = 'email-desc',
  NameAsc = 'name-asc',
  NameDesc = 'name-desc',
  RoleAsc = 'role-asc',
  RoleDesc = 'role-desc',
  StatusAsc = 'status-asc',
  StatusDesc = 'status-desc',
  UpdatedAtAsc = 'updatedAt-asc',
  UpdatedAtDesc = 'updatedAt-desc',
}

@scoped(Lifecycle.ContainerScoped)
export class UserService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly accessTokenService: AccessTokenService,
    private readonly apiKeyRepository: ApiKeyRepository,
  ) {}

  async get({ id }: { id: string }) {
    const user = await this.userRepository.findOne({ id })

    if (user === null) {
      throw new UserNotFoundError()
    }

    return user
  }

  async getByEmail({ email }: { email: string }) {
    const user = await this.userRepository.findOne({ email })

    if (!user) {
      throw new UserNotFoundError()
    }

    return user
  }

  async getUserApiKey({ userId }: { userId: string }) {
    const apiKeys = await this.apiKeyRepository.find({
      user: userId,
      deletedAt: null,
    })

    if (!apiKeys.length) {
      throw new ApiKeyNotFoundError()
    }

    return apiKeys[0]
  }

  count({
    status,
    role,
  }: {
    status?: UserStatus[]
    role?: PlatformRole[]
    indexed?: boolean
  }) {
    return this.userRepository.count({
      $and: [
        status === undefined ? {} : { status: { $in: status } },
        role === undefined ? {} : { role: { $in: role } },
      ],
    })
  }

  list({
    limit = 10,
    offset = 0,
    sort = UserSort.CreatedAtDesc,
    status,
    role,
  }: {
    limit?: number
    offset?: number
    sort?: UserSort
    status?: UserStatus[]
    role?: PlatformRole[]
  }) {
    return this.userRepository.findAndCount(
      {
        $and: [
          status === undefined ? {} : { status: { $in: status } },
          role === undefined ? {} : { role: { $in: role } },
        ],
      },
      {
        limit,
        offset,
        orderBy: parseSort(sort),
      },
    )
  }

  // async getOrCreateEthereumAccountUser(address: string): Promise<User> {
  //   const ethAccount = ethers.utils.getAddress(address)
  //   const existingUser = await this.userRepository.findOne({
  //     ethAccount,
  //   })

  //   if (!existingUser) {
  //     const user = this.userRepository.create({
  //       status: UserStatus.Active,
  //       role: PlatformRole.Authenticated,
  //       ethAccount,
  //     })

  //     this.userRepository.persist(user)
  //     await this.userRepository.flush()
  //     await this.accessTokenService.createApiKey(user)

  //     return this.getOrCreateEthereumAccountUser(ethAccount)
  //   }

  //   return existingUser as User
  // }
}
