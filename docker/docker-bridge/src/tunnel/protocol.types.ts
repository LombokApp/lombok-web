import type net from 'node:net'

/**
 * Tunnel protocol types.
 *
 * Mirrors the Go tunnel-agent's framing protocol. All messages are sent
 * as 5-byte framed packets: [type: 1 byte][length: 4 bytes BE][payload].
 *
 * TEXT frames (0x01) carry JSON control messages.
 * BINARY frames (0x02) carry body payloads.
 */

export type MessageType =
  | 'http_request'
  | 'http_response'
  | 'ws_upgrade'
  | 'ws_upgrade_ack'
  | 'ws_data'
  | 'stream_close'
  | 'body_chunk'
  | 'body_end'
  | 'ready'
  | 'heartbeat'

export interface Envelope {
  type: MessageType
  stream_id?: string
}

export interface HTTPRequestMsg extends Envelope {
  type: 'http_request'
  method: string
  path: string
  headers: Record<string, string>
  body_len?: number
  body_follows?: boolean
}

export interface HTTPResponseMsg extends Envelope {
  type: 'http_response'
  status_code: number
  headers: Record<string, string>
  body_len?: number
  body_follows?: boolean
}

export interface WSUpgradeMsg extends Envelope {
  type: 'ws_upgrade'
  path: string
  headers: Record<string, string>
}

export interface WSUpgradeAckMsg extends Envelope {
  type: 'ws_upgrade_ack'
  success: boolean
  error?: string
}

export interface WSDataMsg extends Envelope {
  type: 'ws_data'
  body_follows: boolean
}

export interface StreamCloseMsg extends Envelope {
  type: 'stream_close'
  reason?: string
}

export interface ReadyMsg extends Envelope {
  type: 'ready'
}

export interface HeartbeatMsg extends Envelope {
  type: 'heartbeat'
}

export interface BodyChunkMsg extends Envelope {
  type: 'body_chunk'
}

export interface BodyEndMsg extends Envelope {
  type: 'body_end'
}

export type TunnelMessage =
  | HTTPRequestMsg
  | HTTPResponseMsg
  | WSUpgradeMsg
  | WSUpgradeAckMsg
  | WSDataMsg
  | StreamCloseMsg
  | ReadyMsg
  | HeartbeatMsg
  | BodyChunkMsg
  | BodyEndMsg

export const FrameType = {
  TEXT: 0x01,
  BINARY: 0x02,
} as const

/**
 * Encode a payload into a 5-byte framed buffer.
 *
 * Frame format: [type: 1 byte][length: 4 bytes BE][payload]
 */
export function encodeFrame(type: number, payload: Buffer): Buffer {
  const header = Buffer.alloc(5)
  header[0] = type
  header.writeUInt32BE(payload.length, 1)
  return Buffer.concat([header, payload])
}

/**
 * Write a framed message to a socket/stream.
 */
export function writeFrame(
  stream: net.Socket,
  type: number,
  payload: Buffer,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const frame = encodeFrame(type, payload)
    stream.write(frame, (err) => {
      if (err) {
        reject(err)
      } else {
        resolve()
      }
    })
  })
}
