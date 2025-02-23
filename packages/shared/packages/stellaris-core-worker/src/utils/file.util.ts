import axios from 'axios'
import crypto from 'crypto'
import fs from 'fs'

export const streamUploadFile = async (
  filepath: string,
  uploadUrl: string,
  mimeType: string,
) => {
  const readmeStream = fs.createReadStream(filepath)
  readmeStream.on('error', (e: any) => {
    if (e.isAxiosError) {
      console.log({ status: e.status, json: e.toJSON() })
    }
    throw e
  })
  const { size } = fs.statSync(filepath)
  console.log('Uploading file of size %d bytes to "%s":', size, uploadUrl)
  await axios.put(uploadUrl, readmeStream, {
    headers: {
      'Content-Type': mimeType,
      'Content-Length': size,
    },
    maxContentLength: Infinity,
    maxBodyLength: Infinity,
  })
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

export const waitForFileOnDisk = (
  filepath: string,
  {
    expectedSize,
    maxTimeWithoutSizeChange = 1000,
    checkInterval = 500,
  }: {
    expectedSize?: number
    maxTimeWithoutSizeChange?: number
    checkInterval?: number
  } = {},
) => {
  return new Promise<void>((resolve, reject) => {
    const startTime = Date.now()
    let lastSize = 0
    let lastSizeChange = startTime
    const checkInt = setInterval(() => {
      const now = Date.now()
      let currentSize = 0
      if (!fs.existsSync(filepath)) {
        // not seen yet
      } else {
        currentSize = fs.statSync(filepath).size

        // complete
        if (expectedSize && currentSize === expectedSize) {
          clearInterval(checkInt)
          resolve()
          return
        }
      }

      // size has changed
      if (currentSize !== lastSize) {
        lastSize = currentSize
        lastSizeChange = now
      } else if (now > lastSizeChange + maxTimeWithoutSizeChange) {
        if (expectedSize) {
          clearInterval(checkInt)
          reject(
            new Error(
              `File download stalled (No change in ${maxTimeWithoutSizeChange} ms)`,
            ),
          )
        } else {
          clearInterval(checkInt)
          resolve()
        }
      }
    }, checkInterval)
  })
}

export const downloadFileToDisk = async (url: string, filepath: string) => {
  let mimeType = ''
  await axios
    .get<fs.ReadStream>(url, {
      responseType: 'stream',
    })
    .then(async (response) => {
      let receivedBytes = 0
      const totalBytes = parseInt(
        response.headers['content-length'] as string,
        10,
      )
      mimeType = response.headers['content-type']
        ? (response.headers['content-type'] as string)
        : ''
      if (!mimeType) {
        throw new Error(`Cannot resolve mimeType for ${url}`)
      }
      const downloadStream = response.data.pipe(fs.createWriteStream(filepath))
      let lastAnnounce = 0
      response.data.on('data', (chunk) => {
        // Update and maybe log progress
        const now = Date.now()
        receivedBytes += chunk.length
        const progress = Math.floor((receivedBytes / totalBytes) * 100)
        if (!lastAnnounce || lastAnnounce < now - 1000 || progress === 100) {
          console.log('Progress: %d%', progress)
          lastAnnounce = now
        }
      })
      response.data.on('error', (e: any) => {
        if (e.isAxiosError) {
          console.log('Download error:', { status: e.status, json: e.toJSON() })
        }
        throw e
      })
      await new Promise((resolve) => {
        downloadStream.on('finish', () => {
          console.log('Finished!')
          resolve(undefined)
        })
      })
    })
  return { mimeType }
}
