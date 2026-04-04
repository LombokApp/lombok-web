import { describe, expect, it } from 'bun:test'

import { createDemuxer } from './demux.js'

function makeFrame(streamType: number, payload: Buffer): Buffer {
  const header = Buffer.alloc(8)
  header[0] = streamType
  header.writeUInt32BE(payload.length, 4)
  return Buffer.concat([header, payload])
}

describe('createDemuxer', () => {
  it('demuxes a single stdout frame', () => {
    const stdout: Buffer[] = []
    const stderr: Buffer[] = []
    const demux = createDemuxer(
      (d) => stdout.push(d),
      (d) => stderr.push(d),
    )

    const payload = Buffer.from('hello stdout')
    demux(makeFrame(1, payload))

    expect(stdout).toHaveLength(1)
    expect(stdout[0].toString()).toBe('hello stdout')
    expect(stderr).toHaveLength(0)
  })

  it('demuxes a single stderr frame', () => {
    const stdout: Buffer[] = []
    const stderr: Buffer[] = []
    const demux = createDemuxer(
      (d) => stdout.push(d),
      (d) => stderr.push(d),
    )

    const payload = Buffer.from('hello stderr')
    demux(makeFrame(2, payload))

    expect(stderr).toHaveLength(1)
    expect(stderr[0].toString()).toBe('hello stderr')
    expect(stdout).toHaveLength(0)
  })

  it('demuxes multiple frames in one chunk', () => {
    const stdout: Buffer[] = []
    const stderr: Buffer[] = []
    const demux = createDemuxer(
      (d) => stdout.push(d),
      (d) => stderr.push(d),
    )

    const frame1 = makeFrame(1, Buffer.from('first'))
    const frame2 = makeFrame(1, Buffer.from('second'))
    demux(Buffer.concat([frame1, frame2]))

    expect(stdout).toHaveLength(2)
    expect(stdout[0].toString()).toBe('first')
    expect(stdout[1].toString()).toBe('second')
  })

  it('handles frame split across two chunks (partial header)', () => {
    const stdout: Buffer[] = []
    const stderr: Buffer[] = []
    const demux = createDemuxer(
      (d) => stdout.push(d),
      (d) => stderr.push(d),
    )

    const frame = makeFrame(1, Buffer.from('split'))
    // Split in the middle of the header (at byte 4)
    demux(frame.subarray(0, 4))
    expect(stdout).toHaveLength(0)

    demux(frame.subarray(4))
    expect(stdout).toHaveLength(1)
    expect(stdout[0].toString()).toBe('split')
  })

  it('handles frame split across two chunks (partial payload)', () => {
    const stdout: Buffer[] = []
    const stderr: Buffer[] = []
    const demux = createDemuxer(
      (d) => stdout.push(d),
      (d) => stderr.push(d),
    )

    const frame = makeFrame(1, Buffer.from('partial-payload'))
    // Split after header + 5 bytes of payload
    demux(frame.subarray(0, 13))
    expect(stdout).toHaveLength(0)

    demux(frame.subarray(13))
    expect(stdout).toHaveLength(1)
    expect(stdout[0].toString()).toBe('partial-payload')
  })

  it('handles interleaved stdout and stderr frames', () => {
    const stdout: Buffer[] = []
    const stderr: Buffer[] = []
    const demux = createDemuxer(
      (d) => stdout.push(d),
      (d) => stderr.push(d),
    )

    const frame1 = makeFrame(1, Buffer.from('out1'))
    const frame2 = makeFrame(2, Buffer.from('err1'))
    const frame3 = makeFrame(1, Buffer.from('out2'))
    demux(Buffer.concat([frame1, frame2, frame3]))

    expect(stdout).toHaveLength(2)
    expect(stdout[0].toString()).toBe('out1')
    expect(stdout[1].toString()).toBe('out2')
    expect(stderr).toHaveLength(1)
    expect(stderr[0].toString()).toBe('err1')
  })

  it('handles zero-length payload frame', () => {
    const stdout: Buffer[] = []
    const stderr: Buffer[] = []
    const demux = createDemuxer(
      (d) => stdout.push(d),
      (d) => stderr.push(d),
    )

    demux(makeFrame(1, Buffer.alloc(0)))
    expect(stdout).toHaveLength(1)
    expect(stdout[0].length).toBe(0)
  })

  it('calls onError for oversized frame payload', () => {
    const stdout: Buffer[] = []
    const stderr: Buffer[] = []
    const errors: Error[] = []
    const demux = createDemuxer(
      (d) => stdout.push(d),
      (d) => stderr.push(d),
      (err) => errors.push(err),
    )

    // Craft a header claiming 16 MB + 1 byte payload
    const header = Buffer.alloc(8)
    header[0] = 1 // stdout
    header.writeUInt32BE(16 * 1024 * 1024 + 1, 4)
    demux(header)

    expect(errors).toHaveLength(1)
    expect(errors[0].message).toContain('exceeds maximum')
    expect(stdout).toHaveLength(0)
    expect(stderr).toHaveLength(0)
  })

  it('continues working after oversized frame is rejected', () => {
    const stdout: Buffer[] = []
    const stderr: Buffer[] = []
    const errors: Error[] = []
    const demux = createDemuxer(
      (d) => stdout.push(d),
      (d) => stderr.push(d),
      (err) => errors.push(err),
    )

    // Send oversized frame header
    const badHeader = Buffer.alloc(8)
    badHeader[0] = 1
    badHeader.writeUInt32BE(16 * 1024 * 1024 + 1, 4)
    demux(badHeader)
    expect(errors).toHaveLength(1)

    // Send a valid frame after the rejection
    demux(makeFrame(1, Buffer.from('recovered')))
    expect(stdout).toHaveLength(1)
    expect(stdout[0].toString()).toBe('recovered')
  })
})
