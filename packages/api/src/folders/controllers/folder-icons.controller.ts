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

import { FolderIconService } from '../services/folder-icon.service'

@Controller('/api/v1/folders')
@ApiTags('Folder Icons')
@UsePipes(ZodValidationPipe)
export class FolderIconsController {
  constructor(private readonly folderIconService: FolderIconService) {}

  @Get('/:folderId/icon/:size')
  @Redirect()
  @Header('Cache-Control', 'public, max-age=300, must-revalidate')
  async getFolderIcon(
    @Param('folderId', ParseUUIDPipe) folderId: string,
    @Param('size') sizeParam: string,
  ): Promise<{ url: string; statusCode: number }> {
    const size = Number.parseInt(sizeParam, 10) as ImageSize
    if (!IMAGE_SIZES.includes(size)) {
      throw new NotFoundException('Unknown icon size')
    }
    const url = await this.folderIconService.resolveIconUrl(folderId, size)
    return { url, statusCode: 302 }
  }
}
