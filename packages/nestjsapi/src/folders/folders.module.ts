import { Module } from '@nestjs/common'

import { FoldersController } from './controllers/folders.controller'
import { FolderService as FoldersService } from './services/folders.service'

@Module({
  controllers: [FoldersController],
  providers: [FoldersService],
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class FoldersModule {}
