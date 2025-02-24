import { Injectable, UnauthorizedException } from '@nestjs/common'
import { and, eq, ilike, or, SQL, sql } from 'drizzle-orm'
import { authHelper } from 'src/auth/utils/auth-helper'
import { parseSort } from 'src/core/utils/sort.util'
import { OrmService } from 'src/orm/orm.service'
import { v4 as uuidV4 } from 'uuid'

import { UserCreateInputDTO } from '../dto/user-create-input.dto'
import { UserUpdateInputDTO } from '../dto/user-update-input.dto'
import { UsersListQueryParamsDTO } from '../dto/users-list-query-params.dto'
import type { NewUser, User } from '../entities/user.entity'
import { usersTable } from '../entities/user.entity'
import { UserIdentityConflictException } from '../exceptions/user-identity-conflict.exception'
import { UserNotFoundException } from '../exceptions/user-not-found.exception'

export enum UserSort {
  CreatedAtAsc = 'createdAt-asc',
  CreatedAtDesc = 'createdAt-desc',
  EmailAsc = 'email-asc',
  EmailDesc = 'email-desc',
  NameAsc = 'name-asc',
  NameDesc = 'name-desc',
  UsernameAsc = 'username-asc',
  UsernameDesc = 'username-desc',
  UpdatedAtAsc = 'updatedAt-asc',
  UpdatedAtDesc = 'updatedAt-desc',
}

@Injectable()
export class UserService {
  constructor(private readonly ormService: OrmService) {}

  async updateViewer(actor: User, { name }: { name: string }): Promise<User> {
    const updatedUser = (
      await this.ormService.db
        .update(usersTable)
        .set({
          name,
        })
        .where(eq(usersTable.id, actor.id))
        .returning()
    )[0]

    return updatedUser
  }

  async getUserByEmail({ email }: { email: string }) {
    const user = await this.ormService.db.query.usersTable.findFirst({
      where: eq(usersTable.email, email),
    })

    if (!user) {
      throw new UserNotFoundException()
    }

    return user
  }

  async getUserById({ id }: { id: string }) {
    const user = await this.ormService.db.query.usersTable.findFirst({
      where: eq(usersTable.id, id),
    })

    if (!user) {
      throw new UserNotFoundException()
    }

    return user
  }

  async listUsers({
    limit = 10,
    offset = 0,
    sort = UserSort.CreatedAtDesc,
    search,
    isAdmin,
  }: {
    limit?: number
    offset?: number
    sort?: UserSort
    search?: string
    isAdmin?: boolean
  }) {
    const conditions: (SQL | undefined)[] = []
    if (search) {
      conditions.push(
        or(
          ilike(usersTable.username, `%${search}%`),
          ilike(usersTable.email, `%${search}%`),
        ),
      )
    }

    if (isAdmin) {
      conditions.push(eq(usersTable.isAdmin, isAdmin))
    }

    const where = conditions.length ? and(...conditions) : undefined

    const users = await this.ormService.db.query.usersTable.findMany({
      where,
      limit: Math.min(100, limit),
      offset: Math.max(0, offset),
      orderBy: parseSort(usersTable, sort),
    })

    const [userCountResult] = await this.ormService.db
      .select({ count: sql<string | null>`count(*)` })
      .from(usersTable)
      .where(where)

    return {
      results: users,
      totalCount: parseInt(userCountResult.count ?? '0', 10),
    }
  }

  listUsersAsAdmin(
    actor: User,
    {
      limit = 10,
      offset = 0,
      search,
      sort = UserSort.CreatedAtDesc,
      isAdmin,
    }: UsersListQueryParamsDTO,
  ) {
    if (!actor.isAdmin) {
      throw new UnauthorizedException()
    }
    return this.listUsers({ limit, offset, search, sort, isAdmin })
  }

  getUserByIdAsAdmin(actor: User, userId: string) {
    if (!actor.isAdmin) {
      throw new UnauthorizedException()
    }
    return this.getUserById({ id: userId })
  }

  async createUserAsAdmin(actor: User, userPayload: UserCreateInputDTO) {
    if (!actor.isAdmin) {
      throw new UnauthorizedException()
    }

    // TODO: input validation
    const now = new Date()

    const passwordSalt = authHelper.createPasswordSalt()
    const newUser: NewUser = {
      id: uuidV4(),
      name: userPayload.name,
      email: userPayload.email,
      isAdmin: userPayload.isAdmin,
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
    try {
      const [createdUser] = await this.ormService.db
        .insert(usersTable)
        .values(newUser)
        .returning()

      return createdUser
    } catch (error: unknown) {
      if (
        error &&
        typeof error === 'object' &&
        'constraint_name' in error &&
        error.constraint_name === 'users_username_unique'
      ) {
        throw new UserIdentityConflictException()
      }
      throw error
    }
  }

  async updateUserAsAdmin(
    actor: User,
    {
      userId,
      updatePayload,
    }: {
      userId: string
      updatePayload: UserUpdateInputDTO
    },
  ) {
    const now = new Date()

    if (!actor.isAdmin) {
      throw new UnauthorizedException()
    }

    // TODO: input validation
    const existingUser = await this.ormService.db.query.usersTable.findFirst({
      where: eq(usersTable.id, userId),
    })

    if (!existingUser) {
      throw new UserNotFoundException()
    }

    const updates: {
      name?: string | null
      isAdmin?: boolean
      email?: string | null
      username?: string
      emailVerified?: boolean
      permissions?: string[]
      passwordHash?: string
      passwordSalt?: string
      updatedAt: Date
    } = { updatedAt: now }

    if ('name' in updatePayload) {
      updates.name = updatePayload.name
    }

    if (typeof updatePayload['isAdmin'] === 'boolean') {
      updates.isAdmin = !!updatePayload.isAdmin
    }

    if ('email' in updatePayload) {
      // TOOD: validate email uniqueness before trying to save, or just catch the error and return a nice response
      updates.email = updatePayload.email
    }

    if ('username' in updatePayload) {
      // TOOD: validate username uniqueness before trying to save, or just catch the error and return a nice response
      updates.username = updatePayload.username
    }

    if ('permissions' in updatePayload) {
      // TODO: validate incoming permission keys
      updates.permissions = updatePayload.permissions
    }

    if ('password' in updatePayload && updatePayload.password?.length) {
      const passwordSalt = authHelper.createPasswordSalt()
      updates.passwordHash = authHelper
        .createPasswordHash(updatePayload.password, passwordSalt)
        .toString('hex')
      updates.passwordSalt = passwordSalt
    }

    const updatedUser = (
      await this.ormService.db
        .update(usersTable)
        .set(updates)
        .where(eq(usersTable.id, existingUser.id))
        .returning()
    )[0]

    return updatedUser
  }

  async deleteUserAsAdmin(actor: User, userId: string) {
    if (!actor.isAdmin) {
      throw new UnauthorizedException()
    }
    await this.ormService.db.delete(usersTable).where(eq(usersTable.id, userId))
  }
}
