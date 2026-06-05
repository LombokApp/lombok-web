import {
  Controller,
  Get,
  Header,
  NotFoundException,
  Param,
  Redirect,
  UsePipes,
} from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { ZodValidationPipe } from 'nestjs-zod'
import { IMAGE_SIZES, ImageSize } from 'src/shared/utils'

import { ServerIconService } from '../services/server-icon.service'

@Controller('/api/v1/server')
@ApiTags('Server Icon')
@UsePipes(ZodValidationPipe)
export class ServerIconController {
  constructor(private readonly serverIconService: ServerIconService) {}

  @Get('/icon/:size')
  @Redirect()
  @Header('Cache-Control', 'public, max-age=300, must-revalidate')
  async getServerIcon(
    @Param('size') sizeParam: string,
  ): Promise<{ url: string; statusCode: number }> {
    const size = Number.parseInt(sizeParam, 10) as ImageSize
    if (!IMAGE_SIZES.includes(size)) {
      throw new NotFoundException('Unknown icon size')
    }
    const url = await this.serverIconService.resolveIconUrl(size)
    return { url, statusCode: 302 }
  }
}
