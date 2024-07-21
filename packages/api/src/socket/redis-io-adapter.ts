import type { ConfigType } from '@nestjs/config'
import { IoAdapter } from '@nestjs/platform-socket.io'
import { createAdapter } from '@socket.io/redis-adapter'
import type { ServerOptions } from 'socket.io'
import type { redisConfig } from 'src/cache/redis.config'
import type { RedisService } from 'src/cache/redis.service'

export class RedisIoAdapter extends IoAdapter {
  private adapterConstructor: ReturnType<typeof createAdapter>
  constructor(
    private readonly _redisConfig: ConfigType<typeof redisConfig>,
    private readonly redisService: RedisService,
  ) {
    super()
  }

  connectAdapter(): void {
    if (!this._redisConfig.enabled) {
      return
    }
    this.adapterConstructor = createAdapter(
      this.redisService.client,
      this.redisService.client.duplicate(),
    )
  }

  createIOServer(port: number, options?: ServerOptions): any {
    console.log('createIOServer:', { port, options })
    const server = super.createIOServer(port, options)
    if (!this._redisConfig.enabled) {
      server.adapter(this.adapterConstructor)
    }
    return server
  }
}
