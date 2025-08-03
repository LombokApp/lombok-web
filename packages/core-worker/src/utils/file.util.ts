import crypto from 'crypto'
import fs from 'fs'

export const uploadFile = async (
  filepath: string,
  uploadUrl: string,
  mimeType?: string,
) => {
  const { size } = fs.statSync(filepath)
  console.log('Uploading file of size %d bytes to "%s":', size, uploadUrl)

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
    throw new Error('No response body available')
  }

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
      console.log('Download progress: %d%', progress)
      lastAnnounce = now
    }
  }

  writeStream.end()
  await new Promise<void>((resolve) =>
    writeStream.on('finish', () => resolve()),
  )
  console.log('Download complete.')

  return { mimeType }
}
