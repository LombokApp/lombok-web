import type { RealtimeEvent, RealtimeScope } from '@lombokapp/types'
import { Injectable } from '@nestjs/common'

import { UserSocketService } from './user/user-socket.service'

/**
 * Single ergonomic entry point for publishing platform realtime events to the
 * `/user` namespace. Stamps the envelope ({ts, v}) and routes by scope. The rest
 * of the backend depends on this rather than poking the socket service directly.
 */
@Injectable()
export class RealtimeService {
  constructor(private readonly userSocket: UserSocketService) {}

  publish(scope: RealtimeScope, event: RealtimeEvent): void {
    this.userSocket.emitEnvelope({
      scope,
      event,
      ts: new Date().toISOString(),
      v: 1,
    })
  }

  toUser(userId: string, event: RealtimeEvent): void {
    this.publish({ kind: 'user', userId }, event)
  }

  toFolder(folderId: string, event: RealtimeEvent): void {
    this.publish({ kind: 'folder', folderId }, event)
  }

  toServer(event: RealtimeEvent): void {
    this.publish({ kind: 'server' }, event)
  }

  // Per-key timers for coalesced server-room nudges.
  private readonly nudgeTimers = new Map<
    string,
    ReturnType<typeof setTimeout>
  >()

  /**
   * Coalesced "something changed" nudge to the server room: emits at most once
   * per intervalMs per key. For high-frequency admin-list streams (logs, events)
   * where per-item emits would be a firehose — the client just refetches on the
   * nudge, so dropping intermediate frames is fine.
   */
  nudgeServer(
    event: RealtimeEvent,
    { key, intervalMs = 1000 }: { key: string; intervalMs?: number },
  ): void {
    if (this.nudgeTimers.has(key)) {
      return
    }
    this.nudgeTimers.set(
      key,
      setTimeout(() => {
        this.nudgeTimers.delete(key)
        this.toServer(event)
      }, intervalMs),
    )
  }

  /** Fan out to every connected user. Use only for non-sensitive "refetch" nudges. */
  broadcastAll(event: RealtimeEvent): void {
    this.userSocket.broadcastEnvelope({
      scope: { kind: 'server' },
      event,
      ts: new Date().toISOString(),
      v: 1,
    })
  }
}
