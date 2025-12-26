export const dockerDemuxStream = async (
  stream: NodeJS.ReadableStream,
): Promise<{ stdout: string; stderr: string }> => {
  // Collect output from the stream
  const output = await new Promise<{ stdout: string; stderr: string }>(
    (resolve, reject) => {
      let stdout = ''
      let stderr = ''
      let buffer = Buffer.alloc(0) // Buffer to hold partial frames

      stream.on('data', (chunk: Buffer) => {
        // Prepend any leftover data from previous chunk
        const combined = Buffer.concat([buffer, chunk])
        buffer = Buffer.alloc(0)

        // Docker multiplexes stdout/stderr with 8-byte headers
        // Each frame: [STREAM_TYPE(1), 0, 0, 0, SIZE(4), PAYLOAD]
        let offset = 0
        while (offset < combined.length) {
          // Need at least 8 bytes for the header
          if (offset + 8 > combined.length) {
            // Incomplete header, save for next chunk
            buffer = combined.subarray(offset)
            break
          }

          // Stream type: 1 = stdout, 2 = stderr
          const streamType = combined[offset]
          const size = combined.readUInt32BE(offset + 4)

          // Check if we have the complete payload
          if (offset + 8 + size > combined.length) {
            // Incomplete payload, save for next chunk
            buffer = combined.subarray(offset)
            break
          }

          // Extract payload and route to appropriate stream
          const payload = combined.subarray(offset + 8, offset + 8 + size)
          const payloadStr = payload.toString()
          if (streamType === 1) {
            // stdout
            stdout += payloadStr
          } else if (streamType === 2) {
            // stderr
            stderr += payloadStr
          }
          offset += 8 + size
        }
      })

      stream.on('end', () => {
        // If there's leftover data in buffer, it's likely incomplete
        // This can happen if the stream closes unexpectedly, but we'll still resolve with what we have
        if (buffer.length > 0) {
          // Try to append any remaining data (might be a partial frame)
          // This is best-effort - we can't guarantee it's complete
          // Since we can't determine stream type from incomplete data, append to stdout as fallback
          stdout += buffer.toString()
        }
        resolve({ stdout, stderr })
      })

      stream.on('error', reject)
    },
  )
  return output
}
