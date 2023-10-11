import { parseSort } from '@stellariscloud/utils'
import { Lifecycle, scoped } from 'tsyringe'

import type { Actor } from '../../auth/actor'
import { PlatformRole } from '../../auth/constants/role.constants'
import { UserRepository } from '../entities/user.repository'
import { UserNotFoundError } from '../errors/user.error'
import type {
  CreateUserData,
  UpdateUserData,
} from '../transfer-objects/user.dto'

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
  constructor(private readonly userRepository: UserRepository) {}

  async updateViewer(actor: Actor, { name }: { name: string }) {
    const user = await this.userRepository.findOne({ id: actor.id })

    if (user === null) {
      throw new UserNotFoundError()
    }

    user.name = name

    await this.userRepository.getEntityManager().flush()

    return user
  }

  async getByEmail({ email }: { email: string }) {
    const user = await this.userRepository.findOne({ email })

    if (!user) {
      throw new UserNotFoundError()
    }

    return user
  }

  async getById({ id }: { id: string }) {
    const user = await this.userRepository.findOne({ id })

    if (!user) {
      throw new UserNotFoundError()
    }

    return user
  }

  count({ role }: { role?: PlatformRole[]; indexed?: boolean }) {
    return this.userRepository.count({
      $and: [role === undefined ? {} : { role: { $in: role } }],
    })
  }

  listUsers({
    limit = 10,
    offset = 0,
    sort = UserSort.CreatedAtDesc,
    role,
  }: {
    limit?: number
    offset?: number
    sort?: UserSort
    role?: PlatformRole[]
  }) {
    return this.userRepository.findAndCount(
      {
        $and: [role === undefined ? {} : { role: { $in: role } }],
      },
      {
        limit,
        offset,
        orderBy: parseSort(sort),
      },
    )
  }

  listUsersAsAdmin(
    actorId: string,
    {
      limit = 10,
      offset = 0,
      sort = UserSort.CreatedAtDesc,
      role,
    }: {
      limit?: number
      offset?: number
      sort?: UserSort
      role?: PlatformRole[]
    },
  ) {
    // TODO: ACL
    return this.listUsers({ limit, offset, sort, role })
  }

  getUserByIdAsAdmin(actorId: string, userId: string) {
    // TODO: ACL
    return this.getById({ id: userId })
  }

  async createUserAsUser(actor: Actor, userPayload: CreateUserData) {
    // TODO: ACL
    // TODO: input validation

    const createdUser = this.userRepository.create({
      name: userPayload.name,
      email: userPayload.email,
      role: userPayload.admin ? PlatformRole.Admin : PlatformRole.User,
      emailVerified: userPayload.emailVerified ?? false,
      username: userPayload.username,
      permissions: userPayload.permissions ?? [],
    })

    createdUser.setPassword(userPayload.password)
    await this.userRepository.getEntityManager().persistAndFlush(createdUser)

    const u = await this.userRepository.findOneOrFail({ id: createdUser.id })
    return u
  }

  async updateUserAsUser(
    actor: Actor,
    userPayload: UpdateUserData & { id: string },
  ) {
    // TODO: ACL
    // TODO: input validation

    const existingUser = await this.userRepository.findOne({
      id: userPayload.id,
    })

    if (!existingUser) {
      throw new UserNotFoundError()
    }

    if (userPayload.admin && existingUser.role !== PlatformRole.Admin) {
      existingUser.role = PlatformRole.Admin
    } else if (!userPayload.admin && existingUser.role === PlatformRole.Admin) {
      existingUser.role = PlatformRole.User
    }

    if (userPayload.name) {
      existingUser.name = userPayload.name
    }

    if (
      (userPayload.emailVerified === false ||
        userPayload.emailVerified === true) &&
      userPayload.emailVerified !== existingUser.emailVerified
    ) {
      existingUser.emailVerified = userPayload.emailVerified
    }

    if (userPayload.password) {
      existingUser.setPassword(userPayload.password)
    }
    if (userPayload.permissions) {
      // TODO: validate incoming permission keys
      existingUser.permissions = userPayload.permissions
    }

    await this.userRepository.getEntityManager().flush()

    const u = await this.userRepository.findOneOrFail({ id: userPayload.id })
    return u
  }

  async deleteUserAsUser(actor: Actor, userId: string) {
    // TODO: ACL
    await this.userRepository.getEntityManager().removeAndFlush({ id: userId })
  }
}
