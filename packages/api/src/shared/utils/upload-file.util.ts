import fs from 'fs'
import axios from 'axios'

export const uploadLocalFile = async (
  filepath: string,
  uploadUrl: string,
  mimeType?: string,
) => {
  const readmeStream = fs.createReadStream(filepath)
  readmeStream.on('error', (e: any) => {
    if (e.isAxiosError) {
      console.log({ status: e.status, json: e.toJSON() })
    }
    throw e
  })
  const { size } = fs.statSync(filepath)
  await axios.put(uploadUrl, readmeStream, {
    headers: {
      ...(mimeType ? { 'Content-Type': mimeType } : {}),
      'Content-Length': size,
    },
    maxContentLength: Infinity,
    maxBodyLength: Infinity,
  })
}
