import fs from 'fs'

export const uploadFile = async (
  filepath: string,
  uploadUrl: string,
  options?: {
    mimeType?: string
    log?: (message: string, ...args: unknown[]) => void
  },
) => {
  const { size } = fs.statSync(filepath)
  options?.log?.('Uploading file of size %d bytes to "%s":', size, uploadUrl)

  const fileBuffer = await Bun.file(filepath).arrayBuffer()
  const blob = new Blob([fileBuffer], { type: options?.mimeType })

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
