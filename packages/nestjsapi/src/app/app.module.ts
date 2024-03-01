import { forwardRef, Module } from '@nestjs/common'
import { FoldersModule } from 'src/folders/folders.module'
import { S3Module } from 'src/s3/s3.module'
import { S3Service } from 'src/s3/s3.service'
import { SocketModule } from 'src/socket/socket.module'
import { SocketService } from 'src/socket/socket.service'

import { AppService } from './services/app.service'

@Module({
  imports: [
    S3Module,
    forwardRef(() => SocketModule),
    forwardRef(() => FoldersModule),
  ],
  providers: [AppService, SocketService, S3Service],
  exports: [AppService],
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class AppModule {}
