import { parseSort } from '@stellariscloud/utils'
import { Lifecycle, scoped } from 'tsyringe'

import type { PlatformRole } from '../../auth/constants/role.constants'
import { ApiKeyRepository } from '../../auth/entities/api-key.repository'
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
}
