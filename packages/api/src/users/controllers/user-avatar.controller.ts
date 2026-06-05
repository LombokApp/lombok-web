import {
  Controller,
  Get,
  Header,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Redirect,
  UsePipes,
} from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { ZodValidationPipe } from 'nestjs-zod'
import { IMAGE_SIZES, ImageSize } from 'src/shared/utils'

import { UserAvatarService } from '../services/user-avatar.service'

@Controller('/api/v1/users')
@ApiTags('User Avatar')
@UsePipes(ZodValidationPipe)
export class UserAvatarController {
  constructor(private readonly userAvatarService: UserAvatarService) {}

  @Get('/:userId/avatar/:size')
  @Redirect()
  @Header('Cache-Control', 'public, max-age=300, must-revalidate')
  async getUserAvatar(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Param('size') sizeParam: string,
  ): Promise<{ url: string; statusCode: number }> {
    const size = Number.parseInt(sizeParam, 10) as ImageSize
    if (!IMAGE_SIZES.includes(size)) {
      throw new NotFoundException('Unknown avatar size')
    }
    const url = await this.userAvatarService.resolveAvatarUrl(userId, size)
    return { url, statusCode: 302 }
  }
}
