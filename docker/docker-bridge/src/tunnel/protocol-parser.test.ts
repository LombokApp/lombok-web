import { describe, expect, it, mock } from 'bun:test'

import type { Envelope } from './protocol.types.js'
import { encodeFrame, FrameType } from './protocol.types.js'
import { ProtocolParser } from './protocol-parser.js'

function createParser() {
  const onMessage = mock((_msg: Envelope) => {})
  const onBinary = mock((_data: Buffer) => {})
  const onError = mock((_err: Error) => {})
  const parser = new ProtocolParser({ onMessage, onBinary, onError })
  return { parser, onMessage, onBinary, onError }
}

describe('ProtocolParser', () => {
  it('parses a single TEXT frame and calls onMessage with parsed JSON', () => {
    const { parser, onMessage } = createParser()
    const msg = { type: 'ready' as const }
    const frame = encodeFrame(FrameType.TEXT, Buffer.from(JSON.stringify(msg)))

    parser.feed(frame)

    expect(onMessage).toHaveBeenCalledTimes(1)
    expect(onMessage.mock.calls[0][0]).toEqual(msg)
  })

  it('parses a single BINARY frame and calls onBinary with data', () => {
    const { parser, onBinary } = createParser()
    const data = Buffer.from('hello binary world')
    const frame = encodeFrame(FrameType.BINARY, data)

    parser.feed(frame)

    expect(onBinary).toHaveBeenCalledTimes(1)
    expect(Buffer.compare(onBinary.mock.calls[0][0], data)).toBe(0)
  })

  it('parses two frames in one chunk', () => {
    const { parser, onMessage, onBinary } = createParser()
    const msg = { type: 'heartbeat' as const }
    const textFrame = encodeFrame(
      FrameType.TEXT,
      Buffer.from(JSON.stringify(msg)),
    )
    const binaryData = Buffer.from('body payload')
    const binFrame = encodeFrame(FrameType.BINARY, binaryData)

    parser.feed(Buffer.concat([textFrame, binFrame]))

    expect(onMessage).toHaveBeenCalledTimes(1)
    expect(onMessage.mock.calls[0][0]).toEqual(msg)
    expect(onBinary).toHaveBeenCalledTimes(1)
    expect(Buffer.compare(onBinary.mock.calls[0][0], binaryData)).toBe(0)
  })

  it('handles frame split across two feed() calls (header split)', () => {
    const { parser, onMessage } = createParser()
    const msg = { type: 'ready' as const }
    const frame = encodeFrame(FrameType.TEXT, Buffer.from(JSON.stringify(msg)))

    // Split in the middle of the header (at byte 3)
    parser.feed(frame.subarray(0, 3))
    expect(onMessage).toHaveBeenCalledTimes(0)

    parser.feed(frame.subarray(3))
    expect(onMessage).toHaveBeenCalledTimes(1)
    expect(onMessage.mock.calls[0][0]).toEqual(msg)
  })

  it('handles frame split across two feed() calls (payload split)', () => {
    const { parser, onMessage } = createParser()
    const msg = {
      type: 'http_response' as const,
      status_code: 200,
      headers: {},
    }
    const frame = encodeFrame(FrameType.TEXT, Buffer.from(JSON.stringify(msg)))

    // Split after header + partial payload (at byte 10)
    parser.feed(frame.subarray(0, 10))
    expect(onMessage).toHaveBeenCalledTimes(0)

    parser.feed(frame.subarray(10))
    expect(onMessage).toHaveBeenCalledTimes(1)
    expect(onMessage.mock.calls[0][0]).toEqual(msg)
  })

  it('calls onError for TEXT frame with invalid JSON', () => {
    const { parser, onError, onMessage } = createParser()
    const frame = encodeFrame(
      FrameType.TEXT,
      Buffer.from('this is not json{{{'),
    )

    parser.feed(frame)

    expect(onError).toHaveBeenCalledTimes(1)
    expect(onError.mock.calls[0][0]).toBeInstanceOf(Error)
    expect(onMessage).toHaveBeenCalledTimes(0)
  })

  it('handles empty payload frame (length=0)', () => {
    const { parser, onBinary } = createParser()
    const frame = encodeFrame(FrameType.BINARY, Buffer.alloc(0))

    parser.feed(frame)

    expect(onBinary).toHaveBeenCalledTimes(1)
    expect(onBinary.mock.calls[0][0].length).toBe(0)
  })

  it('handles large payload (>1MB) frame', () => {
    const { parser, onBinary } = createParser()
    const largePayload = Buffer.alloc(1_048_576 + 100, 0xab) // ~1MB + 100 bytes
    const frame = encodeFrame(FrameType.BINARY, largePayload)

    parser.feed(frame)

    expect(onBinary).toHaveBeenCalledTimes(1)
    expect(onBinary.mock.calls[0][0].length).toBe(largePayload.length)
    expect(Buffer.compare(onBinary.mock.calls[0][0], largePayload)).toBe(0)
  })

  it('encodeFrame produces correct 5-byte header + payload', () => {
    const payload = Buffer.from('test payload')
    const frame = encodeFrame(FrameType.TEXT, payload)

    // Header: 5 bytes
    expect(frame.length).toBe(5 + payload.length)
    expect(frame[0]).toBe(FrameType.TEXT)
    expect(frame.readUInt32BE(1)).toBe(payload.length)
    expect(Buffer.compare(frame.subarray(5), payload)).toBe(0)
  })

  it('calls onError for oversized frame payload', () => {
    const { parser, onError, onMessage, onBinary } = createParser()

    // Craft a frame header claiming a payload larger than 16 MB
    const header = Buffer.alloc(5)
    header[0] = 0x01 // TEXT
    header.writeUInt32BE(16 * 1024 * 1024 + 1, 1) // 16 MB + 1

    parser.feed(header)

    expect(onError).toHaveBeenCalledTimes(1)
    expect(onError.mock.calls[0][0].message).toContain('exceeds maximum')
    expect(onMessage).toHaveBeenCalledTimes(0)
    expect(onBinary).toHaveBeenCalledTimes(0)
  })

  it('accepts frame at exactly 16 MB', () => {
    // We can't allocate 16 MB in test, so just verify the boundary isn't off-by-one
    // by checking that a frame claiming exactly MAX_FRAME_PAYLOAD doesn't trigger error
    const { parser, onError } = createParser()

    const header = Buffer.alloc(5)
    header[0] = 0x02 // BINARY
    header.writeUInt32BE(16 * 1024 * 1024, 1) // exactly 16 MB

    // Feed just the header — should NOT trigger error (frame is incomplete, not oversized)
    parser.feed(header)

    expect(onError).toHaveBeenCalledTimes(0)
  })

  it('reset() clears pending buffer', () => {
    const { parser, onMessage } = createParser()
    const msg = { type: 'ready' as const }
    const frame = encodeFrame(FrameType.TEXT, Buffer.from(JSON.stringify(msg)))

    // Feed partial frame
    parser.feed(frame.subarray(0, 3))
    expect(onMessage).toHaveBeenCalledTimes(0)

    // Reset and feed complete frame
    parser.reset()
    parser.feed(frame)
    expect(onMessage).toHaveBeenCalledTimes(1)
    expect(onMessage.mock.calls[0][0]).toEqual(msg)
  })
})
