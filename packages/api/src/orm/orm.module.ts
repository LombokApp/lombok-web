import type { OnModuleDestroy, OnModuleInit } from '@nestjs/common'
import { Global, Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'

import { ormConfig } from './config'
import { OrmService } from './orm.service'

@Global()
@Module({
  providers: [OrmService],
  imports: [ConfigModule.forFeature(ormConfig)],
  exports: [OrmService, ConfigModule.forFeature(ormConfig)],
})
export class OrmModule implements OnModuleInit, OnModuleDestroy {
  constructor(private readonly ormService: OrmService) {}
  async onModuleInit() {
    await this.ormService.initDatabase()
  }

  async onModuleDestroy() {
    await this.ormService.close()
  }
}
