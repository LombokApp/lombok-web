/**
 * Docker exec 8-byte header stdout/stderr demultiplexer.
 *
 * When Tty=false, Docker multiplexes stdout and stderr with an 8-byte header
 * per chunk:
 *   [stream_type: 1 byte][padding: 3 bytes][payload_length: 4 bytes BE][payload]
 *
 * stream_type: 1 = stdout, 2 = stderr
 *
 * Returns a function that accepts incoming data chunks and calls the
 * appropriate callback for stdout or stderr payloads. Handles partial
 * frames that arrive split across multiple TCP chunks.
 */

/** Maximum payload size for a single Docker demux frame (16 MB). */
const MAX_DEMUX_PAYLOAD = 16 * 1024 * 1024

export function createDemuxer(
  onStdout: (data: Buffer) => void,
  onStderr: (data: Buffer) => void,
  onError?: (err: Error) => void,
): (chunk: Buffer) => void {
  let pending = Buffer.alloc(0)

  return (chunk: Buffer) => {
    pending = Buffer.concat([pending, chunk])

    while (pending.length >= 8) {
      const streamType = pending[0]
      const payloadLength = pending.readUInt32BE(4)

      if (payloadLength > MAX_DEMUX_PAYLOAD) {
        onError?.(
          new Error(
            `Docker demux frame payload ${payloadLength} exceeds maximum ${MAX_DEMUX_PAYLOAD}`,
          ),
        )
        pending = Buffer.alloc(0)
        return
      }

      const frameSize = 8 + payloadLength

      if (pending.length < frameSize) {
        break
      } // partial frame

      const payload = pending.subarray(8, frameSize)
      pending = pending.subarray(frameSize)

      if (streamType === 2) {
        onStderr(Buffer.from(payload))
      } else {
        onStdout(Buffer.from(payload))
      }
    }
  }
}
