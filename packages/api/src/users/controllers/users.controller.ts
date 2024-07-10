import { ZodValidationPipe } from '@anatine/zod-nestjs'
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Req,
  UnauthorizedException,
  UseGuards,
  UsePipes,
} from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import express from 'express'
import { AuthGuard } from 'src/auth/guards/auth.guard'
import { UserGetResponse } from 'src/server/dto/responses/user-get-response.dto'
import { UserListResponse } from 'src/server/dto/responses/user-list-response.dto'
import { UserService } from 'src/users/services/users.service'

@Controller('/server/users')
@ApiTags('Users')
@UsePipes(ZodValidationPipe)
@UseGuards(AuthGuard)
export class UsersController {
  constructor(private readonly userService: UserService) {}

  // /**
  //  * Create a user.
  //  */
  // @Post()
  // async createUser(
  //   @Req() req: express.Request,
  //   @Body() body: UserCreateInputDTO,
  // ): Promise<UserResponse> {
  //   if (!req.user) {
  //     throw new UnauthorizedException()
  //   }
  //   const user = await this.userService.createUserAsAdmin(req.user, body)

  //   return {
  //     user: transformUserToDTO(user),
  //   }
  // }

  // /**
  //  * Update a user.
  //  */
  // @Put()
  // async updateUser(
  //   @Req() req: express.Request,
  //   @Body() body: UserUpdateInputDTO,
  // ): Promise<UserResponse> {
  //   if (!req.user) {
  //     throw new UnauthorizedException()
  //   }
  //   const user = await this.userService.updateUserAsAdmin(req.user, body)

  //   return {
  //     user: transformUserToDTO(user),
  //   }
  // }

  /**
   * List the users.
   */
  @Get()
  async listUsers(@Req() req: express.Request): Promise<UserListResponse> {
    if (!req.user) {
      throw new UnauthorizedException()
    }
    const { results, totalCount } = await this.userService.listUsersAsAdmin(
      req.user,
      {},
    )
    return {
      result: results,
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
    return { user }
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
}
