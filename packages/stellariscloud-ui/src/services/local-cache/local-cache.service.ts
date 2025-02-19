import { indexedDb } from '../indexed-db'

export const addFileToLocalFileStorage = async (
  folderId: string,
  objectIdentifier: string,
  blob: Blob,
) => {
  // Convert blob to base64 string
  const reader = new FileReader()
  // Read the contents of the specified Blob or File
  reader.readAsDataURL(blob)
  return new Promise<string>((resolve) => {
    reader.addEventListener('load', () => {
      resolve(reader.result as string)
    })
  }).then(async (result) => {
    await indexedDb?.putData(folderId, objectIdentifier, {
      dataURL: result,
      type: blob.type,
    })
    return result
  })
}

export const getDataFromDisk = async (
  folderId: string,
  objectIdentifier: string,
): Promise<{ dataURL: string; type: string } | undefined> => {
  const result = await indexedDb?.getData(folderId, objectIdentifier)
  if (result) {
    return { dataURL: result.dataURL, type: result.type }
  }
  return undefined
}
