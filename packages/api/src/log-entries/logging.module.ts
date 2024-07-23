import { Module } from '@nestjs/common'

import { LogEntriesController } from './controllers/log-entries.controller'
import { LogEntryService } from './log-entry.service'

@Module({
  imports: [
    // forwardRef(() => AppModule),
    // AuthModule,
    // nestjsConfig.ConfigModule.forFeature(coreConfig),
  ],
  controllers: [LogEntriesController],
  providers: [LogEntryService],
  exports: [LogEntryService],
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class LoggingModule {}
