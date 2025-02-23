import { Global, Module } from '@nestjs/common'

import { KVService } from './kv.service'

@Global()
@Module({
  imports: [],
  controllers: [],
  providers: [KVService],
  exports: [KVService],
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class CacheModule {}
