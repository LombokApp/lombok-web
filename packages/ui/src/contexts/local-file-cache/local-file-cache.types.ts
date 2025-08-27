export type LocalFileCache = Record<string, { size: number; type: string }>

export class FileCacheError extends Error {}

export interface ILocalFileCacheContext {
  error?: FileCacheError
  isLocal: (folderId: string, key: string) => Promise<boolean>
  isDownloading: (
    folderId: string,
    objectIdentifier: string,
  ) => { progressPercent: number }
  getData: (
    folderId: string,
    objectIdentifier: string,
  ) => Promise<{ dataURL: string; type: string } | undefined>
  downloadLocally: (
    folderId: string,
    key: string,
  ) => Promise<{ dataURL: string }>
  downloadToFile: (
    folderId: string,
    objectIdentifier: string,
    downloadFilename: string,
  ) => void
  uploadFile: (folderId: string, filename: string, file: File) => void
  localStorageFolderSizes: Record<string, number>
  purgeLocalStorageForFolder: (folderId: string) => Promise<boolean>
  recalculateLocalStorageFolderSizes: () => Promise<boolean>
  uploadingProgress: Record<string, number>
  getDataFromMemory: (
    folderId: string,
    key: string,
  ) => { dataURL: string } | undefined
  deleteFromMemory: (folderId: string, key: string) => void
  initialized: boolean
}

export type WorkerMessage = [string, unknown]

export interface DownloadingContext {
  progressPercent: number
  resolve: ({ dataURL }: { dataURL: string; type: string }) => void
  reject: (e: unknown) => void
}

export type DownloadingContextMap = Record<
  string,
  DownloadingContext | undefined
>
