import { Module } from '@nestjs/common'

import { OrmService } from './orm.service'

@Module({
  controllers: [],
  providers: [OrmService],
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class OrmModule {}
