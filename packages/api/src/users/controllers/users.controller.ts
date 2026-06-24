import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
  UsePipes,
} from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import express from 'express'
import { ZodValidationPipe } from 'nestjs-zod'
import { AuthGuard } from 'src/auth/guards/auth.guard'
import { SessionService } from 'src/auth/services/session.service'
import { normalizeSortParam } from 'src/core/utils/sort.util'
import { OrmService } from 'src/orm/orm.service'
import { UserGetResponse } from 'src/server/dto/responses/user-get-response.dto'
import { UserListResponse } from 'src/server/dto/responses/user-list-response.dto'
import { UserSessionListResponse } from 'src/server/dto/responses/user-session-list-response.dto'
import { ApiStandardErrorResponses } from 'src/shared/decorators/api-standard-error-responses.decorator'
import { StagingUploadService } from 'src/storage/staging-upload.service'
import { UserAvatarService } from 'src/users/services/user-avatar.service'
import { UserService } from 'src/users/services/users.service'

import { transformUserToDTO } from '../dto/transforms/user.transforms'
import { UserCreateInputDTO } from '../dto/user-create-input.dto'
import { UserUpdateInputDTO } from '../dto/user-update-input.dto'
import { UsersListQueryParamsDTO } from '../dto/users-list-query-params.dto'

@Controller('/api/v1/server/users')
@ApiTags('Users')
@UsePipes(ZodValidationPipe)
@ApiBearerAuth()
@UseGuards(AuthGuard)
@ApiStandardErrorResponses()
export class UsersController {
  constructor(
    private readonly userService: UserService,
    private readonly sessionService: SessionService,
    private readonly userAvatarService: UserAvatarService,
    private readonly stagingUploadService: StagingUploadService,
    private readonly ormService: OrmService,
  ) {}

  /**
   * Create a user.
   */
  @Post()
  async createUser(
    @Req() req: express.Request,
    @Body() body: UserCreateInputDTO,
  ): Promise<UserGetResponse> {
    if (!req.user) {
      throw new UnauthorizedException()
    }
    const actor = req.user
    // Fetch the staged avatar first so a bad reference fails before any writes.
    // User creation + avatar application run in one transaction so an avatar
    // failure rolls the user back; the staged object is deleted only once
    // everything commits.
    const stagedAvatar = body.avatarStagingKey
      ? await this.stagingUploadService.fetchStagedUpload(
          actor.id,
          body.avatarStagingKey,
          'user-avatar',
        )
      : undefined

    const user = await this.ormService.db.transaction(async (tx) => {
      const created = await this.userService.createUserAsAdmin(actor, body, tx)
      if (stagedAvatar) {
        await this.userAvatarService.setAvatar(created.id, stagedAvatar, tx)
      }
      return created
    })

    if (body.avatarStagingKey) {
      await this.stagingUploadService.deleteStagedUpload(
        actor.id,
        body.avatarStagingKey,
        'user-avatar',
      )
    }

    return {
      user: transformUserToDTO(user),
    }
  }

  /**
   * Update a user.
   */
  @Patch('/:userId')
  async updateUser(
    @Req() req: express.Request,
    @Body() body: UserUpdateInputDTO,
    @Param('userId') userId: string,
  ): Promise<UserGetResponse> {
    if (!req.user) {
      throw new UnauthorizedException()
    }
    const actor = req.user

    const stagedAvatar = body.avatarStagingKey
      ? await this.stagingUploadService.fetchStagedUpload(
          actor.id,
          body.avatarStagingKey,
          'user-avatar',
        )
      : undefined

    const user = await this.ormService.db.transaction(async (tx) => {
      const updated = await this.userService.updateUserAsAdmin(
        actor,
        { userId, updatePayload: body },
        tx,
      )
      if (stagedAvatar) {
        await this.userAvatarService.setAvatar(userId, stagedAvatar, tx)
      }
      return updated
    })

    if (body.avatarStagingKey) {
      await this.stagingUploadService.deleteStagedUpload(
        actor.id,
        body.avatarStagingKey,
        'user-avatar',
      )
    }

    return {
      user: transformUserToDTO(user),
    }
  }

  /**
   * List the users.
   */
  @Get()
  async listUsers(
    @Req() req: express.Request,
    @Query() queryParams: UsersListQueryParamsDTO,
  ): Promise<UserListResponse> {
    if (!req.user) {
      throw new UnauthorizedException()
    }
    const { results, totalCount } = await this.userService.listUsersAsAdmin(
      req.user,
      {
        ...queryParams,
        sort: normalizeSortParam(queryParams.sort),
      },
    )
    return {
      result: results.map((user) => transformUserToDTO(user)),
      meta: { totalCount },
    }
  }

  /**
   * Get a user by id.
   */
  @Get('/:userId')
  async getUser(
    @Req() req: express.Request,
    @Param('userId') userId: string,
  ): Promise<UserGetResponse> {
    if (!req.user) {
      throw new UnauthorizedException()
    }
    const user = await this.userService.getUserByIdAsAdmin(req.user, userId)
    return { user: transformUserToDTO(user) }
  }

  /**
   * Delete a server user by id.
   */
  @Delete('/:userId')
  async deleteUser(
    @Req() req: express.Request,
    @Param('userId') userId: string,
  ): Promise<void> {
    if (!req.user) {
      throw new UnauthorizedException()
    }
    await this.userService.deleteUserAsAdmin(req.user, userId)
  }

  @Get(':userId/sessions')
  async listActiveUserSessions(
    @Req() req: express.Request,
    @Param('userId') userId: string,
  ): Promise<UserSessionListResponse> {
    if (!req.user) {
      throw new UnauthorizedException()
    }
    const user = await this.userService.getUserByIdAsAdmin(req.user, userId)
    const sessions = await this.sessionService.listActiveUserSessions(user)
    return {
      result: sessions.map((session) => ({
        ...session,
        createdAt: session.createdAt.toISOString(),
        updatedAt: session.updatedAt.toISOString(),
        expiresAt: session.expiresAt.toISOString(),
      })),
      meta: { totalCount: sessions.length },
    }
  }
}
