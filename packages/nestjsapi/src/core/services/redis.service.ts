import { Injectable } from '@nestjs/common'
import type { RedisClientType } from 'redis'
import { createClient } from 'redis'

import { EnvConfigProvider } from '../config/env-config.provider'

@Injectable()
export class RedisService {
  client: RedisClientType = createClient({
    url: `redis://${this.config.getRedisConfig().host}:${
      this.config.getRedisConfig().port
    }`,
  })

  constructor(private readonly config: EnvConfigProvider) {
    void this.client.connect()
  }

  async onModuleDestroy(): Promise<void> {
    await this.close()
  }

  async close() {
    await this.client.disconnect()
  }
}
