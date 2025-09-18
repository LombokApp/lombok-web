import crypto from 'crypto'
import fs from 'fs'

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
