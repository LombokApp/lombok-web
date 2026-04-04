import type { Envelope } from './protocol.types.js'

/** Maximum payload size for a single frame (16 MB). Matches tunnel-agent limit. */
const MAX_FRAME_PAYLOAD = 16 * 1024 * 1024

export interface ProtocolParserCallbacks {
  onMessage: (msg: Envelope) => void
  onBinary: (data: Buffer) => void
  onError: (err: Error) => void
}

/**
 * Parses 5-byte framed protocol messages from exec stdout.
 *
 * Frame format: [type: 1 byte][length: 4 bytes BE][payload]
 *   - type 0x01 (TEXT): payload is JSON, parsed and dispatched via onMessage
 *   - type 0x02 (BINARY): payload dispatched via onBinary
 *
 * Handles partial frames that arrive split across multiple feed() calls.
 */
export class ProtocolParser {
  private pending: Buffer = Buffer.alloc(0)
  private readonly callbacks: ProtocolParserCallbacks

  constructor(callbacks: ProtocolParserCallbacks) {
    this.callbacks = callbacks
  }

  /**
   * Feed a chunk of data from exec stdout into the parser.
   * May trigger zero or more callback invocations depending on
   * how many complete frames are available.
   */
  feed(chunk: Buffer): void {
    this.pending = Buffer.concat([this.pending, chunk])

    while (this.pending.length >= 5) {
      const frameType = this.pending[0]
      const payloadLength = this.pending.readUInt32BE(1)

      if (payloadLength > MAX_FRAME_PAYLOAD) {
        this.callbacks.onError(
          new Error(
            `Frame payload ${payloadLength} exceeds maximum ${MAX_FRAME_PAYLOAD}`,
          ),
        )
        this.pending = Buffer.alloc(0)
        return
      }

      const frameSize = 5 + payloadLength

      if (this.pending.length < frameSize) {
        break
      } // incomplete payload

      const payload = this.pending.subarray(5, frameSize)
      this.pending = this.pending.subarray(frameSize)

      if (frameType === 0x01) {
        // TEXT frame: parse JSON
        try {
          const msg = JSON.parse(payload.toString('utf8')) as Envelope
          this.callbacks.onMessage(msg)
        } catch (err) {
          this.callbacks.onError(
            err instanceof Error
              ? err
              : new Error('Failed to parse TEXT frame JSON'),
          )
        }
      } else if (frameType === 0x02) {
        // BINARY frame
        this.callbacks.onBinary(Buffer.from(payload))
      }
    }
  }

  /**
   * Clear the pending buffer. Useful when resetting after errors
   * or tearing down a session.
   */
  reset(): void {
    this.pending = Buffer.alloc(0)
  }
}
