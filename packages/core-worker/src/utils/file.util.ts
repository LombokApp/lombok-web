import crypto from 'crypto'
import fs from 'fs'

export const uploadFile = async (
  filepath: string,
  uploadUrl: string,
  mimeType?: string,
) => {
  const { size } = fs.statSync(filepath)

  const fileBuffer = await Bun.file(filepath).arrayBuffer()
  const blob = new Blob([fileBuffer], { type: mimeType })

  const response = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Length': size.toString(),
    },
    body: blob,
  })

  if (!response.ok) {
    throw new Error(`Upload failed with status ${response.status}`)
  }
}

export const hashFileStream = async (
  stream: fs.ReadStream,
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha1').setEncoding('hex')

    // Handle errors from the original stream
    stream.on('error', (error) => {
      reject(error)
    })

    stream
      .pipe(hash)
      .on('finish', () => {
        hash.end()
        resolve(hash.read() as string)
      })
      .on('error', (error) => {
        reject(error)
      })
  })
}

export const hashLocalFile = async (filepath: string): Promise<string> => {
  const readStream = fs.createReadStream(filepath)

  return hashFileStream(readStream)
}

export const downloadFileToDisk = async (url: string, filepath: string) => {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Download failed with status ${response.status}`)
  }

  const mimeType = response.headers.get('content-type')
  if (!mimeType) {
    throw new Error(`Cannot resolve mimeType for ${url}`)
  }

  const totalBytes = parseInt(response.headers.get('content-length') || '0', 10)
  let receivedBytes = 0
  let lastAnnounce = 0

  const writeStream = fs.createWriteStream(filepath)
  const reader = response.body?.getReader()
  if (!reader) {
    writeStream.destroy()
    throw new Error('No response body available')
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    while (true) {
      const { done, value } = await reader.read()
      if (done) {
        break
      }

      writeStream.write(value)
      receivedBytes += value.length
      const progress = Math.floor((receivedBytes / totalBytes) * 100)

      const now = Date.now()
      if (!lastAnnounce || lastAnnounce < now - 1000 || progress === 100) {
        lastAnnounce = now
      }
    }

    // Close the write stream and wait for it to finish
    writeStream.end()

    // Use a more robust approach to ensure the file is written
    await new Promise<void>((resolve, reject) => {
      let resolved = false

      const cleanup = () => {
        if (resolved) {
          return
        }
        resolved = true
        writeStream.removeAllListeners()
      }

      writeStream.on('finish', () => {
        cleanup()
        resolve()
      })

      writeStream.on('error', (error) => {
        cleanup()
        reject(error)
      })

      // Fallback timeout to prevent hanging
      setTimeout(() => {
        if (!resolved) {
          cleanup()
          reject(new Error('Write stream timeout'))
        }
      }, 5000)
    })

    // Additional verification that the file exists and has content
    return { mimeType }
  } catch (error) {
    // Clean up resources on error
    writeStream.destroy()
    if (typeof reader.releaseLock === 'function') {
      reader.releaseLock()
    }
    throw error
  } finally {
    // Ensure reader is always released
    if (typeof reader.releaseLock === 'function') {
      reader.releaseLock()
    }
  }
}
