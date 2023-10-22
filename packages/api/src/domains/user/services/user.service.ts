import { eq, inArray, sql } from 'drizzle-orm'
import { Lifecycle, scoped } from 'tsyringe'
import { v4 as uuidV4 } from 'uuid'

import { OrmService } from '../../../orm/orm.service'
import { parseSort } from '../../../util/sort.util'
import type { Actor } from '../../auth/actor'
import type { SaveablePlatformRole } from '../../auth/constants/role.constants'
import { PlatformRole } from '../../auth/constants/role.constants'
import { authHelper } from '../../auth/utils/auth-helper'
import type { NewUser } from '../entities/user.entity'
import { usersTable } from '../entities/user.entity'
import { UserNotFoundError } from '../errors/user.error'
import type {
  CreateUserData,
  UpdateUserData,
} from '../transfer-objects/user.dto'
import { UserAuthService } from './user-auth.service'

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
    private readonly ormService: OrmService,
    private readonly userAuthService: UserAuthService,
  ) {}

  async updateViewer(actor: Actor, { name }: { name: string }) {
    const user = await this.ormService.db.query.usersTable.findFirst({
      where: eq(usersTable.id, actor.id),
    })

    if (!user) {
      throw new UserNotFoundError()
    }

    user.name = name

    const updatedUser = (
      await this.ormService.db
        .update(usersTable)
        .set({
          name,
        })
        .where(eq(usersTable.id, user.id))
        .returning()
    )[0]

    return updatedUser
  }

  async getByEmail({ email }: { email: string }) {
    const user = await this.ormService.db.query.usersTable.findFirst({
      where: eq(usersTable.email, email),
    })

    if (!user) {
      throw new UserNotFoundError()
    }

    return user
  }

  async getById({ id }: { id: string }) {
    const user = await this.ormService.db.query.usersTable.findFirst({
      where: eq(usersTable.id, id),
    })

    if (!user) {
      throw new UserNotFoundError()
    }

    return user
  }

  async listUsers({
    limit = 10,
    offset = 0,
    sort = UserSort.CreatedAtDesc,
    roles,
  }: {
    limit?: number
    offset?: number
    sort?: UserSort
    roles?: (PlatformRole.Admin | PlatformRole.User)[]
  }) {
    const users = await this.ormService.db.query.usersTable.findMany({
      ...(roles
        ? {
            where: inArray(usersTable.role, roles),
          }
        : undefined),
      limit,
      offset,
      orderBy: parseSort(usersTable, sort),
    })
    const [userCountResult] = await this.ormService.db
      .select({ count: sql<string | null>`count(*)` })
      .from(usersTable)

    return {
      results: users,
      totalCount: parseInt(userCountResult.count ?? '0', 10),
    }
  }

  listUsersAsAdmin(
    actorId: string,
    {
      limit = 10,
      offset = 0,
      sort = UserSort.CreatedAtDesc,
      roles,
    }: {
      limit?: number
      offset?: number
      sort?: UserSort
      roles?: (PlatformRole.Admin | PlatformRole.User)[]
    },
  ) {
    // TODO: ACL
    return this.listUsers({ limit, offset, sort, roles })
  }

  getUserByIdAsAdmin(actorId: string, userId: string) {
    // TODO: ACL
    return this.getById({ id: userId })
  }

  async createUserAsAdmin(actor: Actor, userPayload: CreateUserData) {
    // TODO: ACL
    // TODO: input validation

    const now = new Date()

    const passwordSalt = authHelper.createPasswordSalt()
    const newUser: NewUser = {
      id: uuidV4(),
      name: userPayload.name,
      email: userPayload.email,
      role: userPayload.admin ? PlatformRole.Admin : PlatformRole.User,
      emailVerified: userPayload.emailVerified ?? false,
      username: userPayload.username,
      passwordHash: authHelper
        .createPasswordHash(userPayload.password, passwordSalt)
        .toString('hex'),
      passwordSalt,
      permissions: userPayload.permissions ?? [],
      createdAt: now,
      updatedAt: now,
    }

    const [createdUser] = await this.ormService.db
      .insert(usersTable)
      .values(newUser)
      .returning()

    return createdUser
  }

  async updateUserAsAdmin(
    actor: Actor,
    userPayload: UpdateUserData & { id: string },
  ) {
    // TODO: ACL
    // TODO: input validation

    const existingUser = await this.ormService.db.query.usersTable.findFirst({
      where: eq(usersTable.id, userPayload.id),
    })

    if (!existingUser) {
      throw new UserNotFoundError()
    }

    const updates: {
      role?: SaveablePlatformRole
      name?: string
      emailVerified?: boolean
      passwordHash?: string
      passwordSalt?: string
      permissions?: string[]
    } = {}

    if (userPayload.admin && existingUser.role !== PlatformRole.Admin) {
      updates.role = PlatformRole.Admin
    } else if (!userPayload.admin && existingUser.role === PlatformRole.Admin) {
      updates.role = PlatformRole.User
    }

    if (userPayload.name) {
      updates.name = userPayload.name
    }

    if (
      (userPayload.emailVerified === false ||
        userPayload.emailVerified === true) &&
      userPayload.emailVerified !== existingUser.emailVerified
    ) {
      updates.emailVerified = userPayload.emailVerified
    }

    if (userPayload.password) {
      const passwordSalt = authHelper.createPasswordSalt()
      updates.passwordHash = authHelper
        .createPasswordHash(userPayload.password, passwordSalt)
        .toString('hex')
      updates.passwordSalt = passwordSalt
    }
    if (userPayload.permissions) {
      // TODO: validate incoming permission keys
      updates.permissions = userPayload.permissions
    }

    const user = (
      await this.ormService.db
        .update(usersTable)
        .set(updates)
        .where(eq(usersTable.id, existingUser.id))
        .returning()
    )[0]

    return user
  }

  async deleteUserAsAdmin(actor: Actor, userId: string) {
    // TODO: ACL
    await this.ormService.db.delete(usersTable).where(eq(usersTable.id, userId))
  }
}
