import type { RedisClientType } from 'redis'
import { createClient } from 'redis'
import { singleton } from 'tsyringe'

import { EnvConfigProvider } from '../config/env-config.provider'
import { registerExitHandler } from '../util/process.util'

@singleton()
export class RedisService {
  client: RedisClientType = createClient({
    url: `redis://${this.config.getRedisConfig().host}:${
      this.config.getRedisConfig().port
    }`,
  })

  constructor(private readonly config: EnvConfigProvider) {
    void this.client.connect()
    registerExitHandler(async () => this.client.disconnect())
  }

  async close() {
    await this.client.disconnect()
  }
}
