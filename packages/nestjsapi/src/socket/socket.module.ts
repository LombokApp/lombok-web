import { Module } from '@nestjs/common'
import { AppModule } from 'src/app/app.module'
import { AppService } from 'src/app/services/app.service'
import { FoldersModule } from 'src/folders/folders.module'
import { S3Module } from 'src/s3/s3.module'

import { SocketService } from './socket.service'

@Module({
  controllers: [],
  imports: [FoldersModule, AppModule, S3Module],
  providers: [SocketService, AppService],
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class SocketModule {}
