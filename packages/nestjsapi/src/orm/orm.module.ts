import { Global, Module } from '@nestjs/common'

import { OrmService } from './orm.service'

@Global()
@Module({
  controllers: [],
  providers: [OrmService],
  exports: [OrmService],
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class OrmModule {}
