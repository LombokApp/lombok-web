import type { AxiosError } from 'axios'
import axios from 'axios'
import fs from 'fs'

export const uploadLocalFile = async (
  filepath: string,
  uploadUrl: string,
  mimeType?: string,
) => {
  const readmeStream = fs.createReadStream(filepath)
  readmeStream.on('error', (e: unknown) => {
    if (e && typeof e === 'object' && 'isAxiosError' in e) {
      // eslint-disable-next-line no-console
      console.log({
        status: (e as AxiosError).status,
        json: (e as AxiosError).toJSON(),
      })
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
