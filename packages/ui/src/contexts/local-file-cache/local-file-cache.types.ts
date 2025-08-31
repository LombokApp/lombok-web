export type LocalFileCache = Record<string, { size: number; type: string }>

export class FileCacheError extends Error {}

export interface ILocalFileCacheContext {
  error?: FileCacheError
  getPresignedDownloadUrl: (
    folderId: string,
    objectIdentifier: string,
  ) => Promise<{ url: string }>
  downloadToFile: (
    folderId: string,
    objectIdentifier: string,
    downloadFilename: string,
  ) => void
  uploadFile: (folderId: string, filename: string, file: File) => void
  uploadingProgress: Record<string, number>
  initialized: boolean
}

export type WorkerMessage = [string, unknown]
export interface PresignedUrlGeneratingContext {
  resolve: ({ url }: { url: string }) => void
  reject: (e: unknown) => void
}

export type PresignedUrlGeneratingContextMap = Record<
  string,
  PresignedUrlGeneratingContext | undefined
>
