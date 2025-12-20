export const dockerDemuxStream = async (stream: NodeJS.ReadableStream) => {
  // Collect output from the stream
  const output = await new Promise<string>((resolve, reject) => {
    let data = ''
    stream.on('data', (chunk: Buffer) => {
      // Docker multiplexes stdout/stderr, skip the 8-byte header
      // Each frame: [STREAM_TYPE(1), 0, 0, 0, SIZE(4), PAYLOAD]
      let offset = 0
      while (offset < chunk.length) {
        if (offset + 8 > chunk.length) {
          break
        }
        const size = chunk.readUInt32BE(offset + 4)
        if (offset + 8 + size > chunk.length) {
          break
        }
        data += chunk.subarray(offset + 8, offset + 8 + size).toString()
        offset += 8 + size
      }
    })
    stream.on('end', () => resolve(data))
    stream.on('error', reject)
  })
  return output
}
