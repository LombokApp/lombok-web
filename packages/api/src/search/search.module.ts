import { forwardRef, Module } from '@nestjs/common'
import { AppModule } from 'src/app/app.module'
import { FoldersModule } from 'src/folders/folders.module'
import { OrmModule } from 'src/orm/orm.module'
import { ServerModule } from 'src/server/server.module'

import { SearchController } from './controllers/search.controller'
import { SearchService } from './services/search.service'

@Module({
  controllers: [SearchController],
  imports: [
    forwardRef(() => AppModule),
    FoldersModule,
    OrmModule,
    ServerModule,
  ],
  providers: [SearchService],
  exports: [SearchService],
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class SearchModule {}
