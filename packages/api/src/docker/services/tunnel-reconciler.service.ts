import { Injectable, Logger, type OnApplicationBootstrap } from '@nestjs/common'

import { DockerBridgeService } from './docker-bridge.service'
import { DurableTunnelService } from './durable-tunnel.service'

/** Max concurrent ensureLive calls during a bulk replay. */
const REPLAY_CONCURRENCY = 6

/** Replays durable tunnels into live bridge sessions on each bridge (re)connect; separate from DurableTunnelService to avoid a DockerBridgeService import cycle. */
@Injectable()
export class TunnelReconcilerService implements OnApplicationBootstrap {
  private readonly logger = new Logger(TunnelReconcilerService.name)
  private replaying = false

  constructor(
    private readonly dockerBridgeService: DockerBridgeService,
    private readonly durableTunnelService: DurableTunnelService,
  ) {}

  onApplicationBootstrap(): void {
    this.dockerBridgeService.onReady(() => {
      void this.replayAll()
    })
  }

  /** Re-bind every durable tunnel under its stable publicId; bounded concurrency, per-row error isolation, guarded against overlapping replays. */
  async replayAll(): Promise<void> {
    if (this.replaying) {
      this.logger.debug('Replay already in progress, skipping')
      return
    }
    this.replaying = true
    try {
      const ids = await this.durableTunnelService.listAllIds()
      if (ids.length === 0) {
        return
      }
      this.logger.log(`Replaying ${ids.length} durable tunnel(s)`)

      let cursor = 0
      const worker = async (): Promise<void> => {
        while (cursor < ids.length) {
          const id = ids[cursor++]
          if (id === undefined) {
            continue
          }
          try {
            await this.durableTunnelService.ensureLive(id)
          } catch (err) {
            this.logger.warn(
              `Replay failed for tunnel ${id}: ${err instanceof Error ? err.message : String(err)}`,
            )
          }
        }
      }

      await Promise.all(
        Array.from({ length: Math.min(REPLAY_CONCURRENCY, ids.length) }, () =>
          worker(),
        ),
      )
      this.logger.log('Durable tunnel replay complete')
    } catch (err) {
      this.logger.error(
        `Durable tunnel replay errored: ${err instanceof Error ? err.message : String(err)}`,
      )
    } finally {
      this.replaying = false
    }
  }
}
