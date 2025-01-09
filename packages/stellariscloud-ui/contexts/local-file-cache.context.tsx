import React from 'react'

import { indexedDb } from '../services/indexed-db'
import { getDataFromDisk } from '../services/local-cache/local-cache.service'
import { downloadData } from '../utils/file'
import type { LogLine } from './logging.context'
import { useLoggingContext } from './logging.context'
import { sdkInstance } from '../services/api'

export interface LocalFileCache {
  [key: string]: { size: number; type: string }
}

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
  localStorageFolderSizes: { [key: string]: number }
  purgeLocalStorageForFolder: (folderId: string) => Promise<boolean>
  recalculateLocalStorageFolderSizes: () => Promise<boolean>
  uploadingProgress: { [key: string]: number }
  getDataFromMemory: (
    folderId: string,
    key: string,
  ) => { dataURL: string } | undefined
  deleteFromMemory: (folderId: string, key: string) => void
  initialized: boolean
}
const LocalFileCacheContext = React.createContext<ILocalFileCacheContext>(
  {} as ILocalFileCacheContext,
)

type WorkerMessage = [string, unknown]

interface DownloadingContext {
  progressPercent: number
  resolve: ({ dataURL }: { dataURL: string; type: string }) => void
  reject: (e: unknown) => void
}

interface DownloadingContextMap {
  [key: string]: DownloadingContext | undefined
}

export const LocalFileCacheContextProvider = ({
  children,
}: {
  children: React.ReactNode
}) => {
  const downloading = React.useRef<DownloadingContextMap>({})
  const [localStorageFolderSizes, setLocalStorageFolderSizes] = React.useState<{
    [key: string]: number
  }>({})
  const [uploadingProgress, setUploadingProgress] = React.useState<{
    [key: string]: number
  }>({})
  const workerRef = React.useRef<Worker>()
  const fileCacheRef = React.useRef<{
    [key: string]: { dataURL: string; type: string } | undefined
  }>({})
  const loggingContext = useLoggingContext()

  const addDataToMemory = React.useCallback(
    (
      folderId: string,
      objectIdentifier: string,
      data: { dataURL: string; type: string },
    ) => {
      // console.log('addFileToMemory(%s, %s, ...)', folderId, objectIdentifier)
      fileCacheRef.current[`${folderId}:${objectIdentifier}`] = data
      return fileCacheRef.current[`${folderId}:${objectIdentifier}`] as {
        dataURL: string
        type: string
      }
    },
    [],
  )

  const getDataFromMemory = React.useCallback(
    (folderId: string, objectIdentifier: string) => {
      // console.log('getFileFromMemory(%s, %s)', folderId, objectIdentifier)
      return fileCacheRef.current[`${folderId}:${objectIdentifier}`]
    },
    [],
  )

  const deleteFromMemory = React.useCallback(
    (folderId: string, objectIdentifier: string) => {
      // console.log('deleteFromMemory(%s, %s)', folderId, objectIdentifier)

      delete fileCacheRef.current[`${folderId}:${objectIdentifier}`]
    },
    [],
  )

  const updateWorkerWithAuth = React.useCallback(() => {
    void sdkInstance.authenticator.getAccessToken().then((t) => {
      workerRef.current?.postMessage(['AUTH_UPDATED', t])
    })
  }, [])

  React.useEffect(() => {
    if (!workerRef.current) {
      updateWorkerWithAuth()
      workerRef.current = new Worker(new URL('../worker.ts', import.meta.url))
      sdkInstance.authenticator.addEventListener('onStateChanged', () => {
        updateWorkerWithAuth()
      })

      workerRef.current.addEventListener(
        'message',
        (event: MessageEvent<WorkerMessage>) => {
          // console.log('MESSSAGE FROM WORKER:', event)
          if (
            ['DOWNLOAD_COMPLETED', 'DOWNLOAD_FAILED'].includes(event.data[0])
          ) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
            const folderId: string = (event.data[1] as any).folderId as string
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            const objectIdentifier: string =
              // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
              (event.data[1] as any).objectIdentifier
            const folderIdAndKey = `${folderId}:${objectIdentifier}`
            if (event.data[0] === 'DOWNLOAD_FAILED') {
              downloading.current[folderIdAndKey]?.reject(
                `Failed downloading file: ${JSON.stringify(
                  event.data,
                  null,
                  2,
                )}`,
              )

              delete downloading.current[folderIdAndKey]
            } else {
              void getDataFromDisk(folderId, objectIdentifier).then((data) => {
                if (data?.dataURL) {
                  addDataToMemory(folderId, objectIdentifier, data)
                  // console.log('blob from disk:', blob, downloading.current)
                  downloading.current[folderIdAndKey]?.resolve(data)
                } else {
                  downloading.current[folderIdAndKey]?.reject(
                    `Failed to load data "${objectIdentifier}" from disk.`,
                  )
                }

                delete downloading.current[folderIdAndKey]
              })
            }
          } else if (event.data[0] === 'LOG_MESSAGE') {
            // const folderId: string = event.data[1].folderId
            const line = event.data[1] as LogLine
            loggingContext.appendLogLine({
              ...line,
              remote: false,
            })
          } else if (event.data[0] === 'UPLOAD_PROGRESS') {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
            const progress = (event.data[1] as any).progress as number
            // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
            const uploadObjectKey = (event.data[1] as any).objectKey as string
            setUploadingProgress((up) => ({
              ...up,
              [uploadObjectKey]: progress,
            }))
          } else {
            // console.log(`WebWorker Response => ${event.data}`)
          }
        },
      )
      return () => {
        // console.log('Terminating worker...')
        // workerRef.current?.terminate()
      }
    }
  }, [downloading, loggingContext, addDataToMemory, updateWorkerWithAuth])

  const downloadLocally = React.useCallback(
    (folderId: string, objectIdentifier: string) => {
      return new Promise(
        (
          resolve: (result: { dataURL: string; type: string }) => void,
          reject,
        ) => {
          const folderIdAndKey = `${folderId}:${objectIdentifier}`
          if (downloading.current[folderIdAndKey]) {
            const oldResolve = downloading.current[folderIdAndKey]?.resolve as (
              blob: unknown,
            ) => void
            const oldReject = downloading.current[folderIdAndKey]?.reject as (
              e: unknown,
            ) => void

            const downloadingContext = downloading.current[folderIdAndKey]
            downloadingContext.resolve = (result) => {
              resolve(result)
              oldResolve(result)
            }
            downloadingContext.reject = (e: unknown) => {
              // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
              reject(e)
              oldReject(e)
            }
          } else {
            downloading.current[folderIdAndKey] = {
              progressPercent: 0,
              resolve,
              reject,
            }
            workerRef.current?.postMessage([
              'DOWNLOAD',
              { folderId, objectIdentifier },
            ])
          }
        },
      )
    },
    [downloading],
  )

  const getData = React.useCallback(
    async (folderId: string, objectIdentifier: string) => {
      let result: { dataURL: string; type: string } | undefined
      result = getDataFromMemory(folderId, objectIdentifier)
      // console.log('result from memory:', result)
      if (!result) {
        const data = await getDataFromDisk(folderId, objectIdentifier)
        if (data) {
          result = addDataToMemory(folderId, objectIdentifier, data)
        }

        // console.log('blob from disk:', blob)
      }
      if (!result) {
        // blob = await getFileBlobFromDisk(folderId, k)
        result = await downloadLocally(folderId, objectIdentifier)
        // console.log('blob from download:', blob)
      }
      // const fileType = blob.type
      // const data = window.URL.createObjectURL(blob)
      return result
    },
    [downloadLocally, getDataFromMemory, addDataToMemory],
  )

  const uploadFile = React.useCallback(
    (folderId: string, objectKey: string, file: File) => {
      void workerRef.current?.postMessage([
        'UPLOAD',
        {
          folderId,
          objectIdentifier: `content:${objectKey}`,
          uploadFile: file,
        },
      ])
    },
    [],
  )

  const downloadToFile = React.useCallback(
    (folderId: string, objectIdentifer: string, downloadFilename: string) => {
      void getData(folderId, objectIdentifer).then((f) => {
        downloadData(f.dataURL, downloadFilename)
      })
    },
    [getData],
  )

  const isLocal = React.useCallback(async (folderId: string, key: string) => {
    return !!(await indexedDb?.getMetadata(`${folderId}:${key}`))?.result
  }, [])

  const isDownloading = (folderId: string, key: string) => {
    return downloading.current[`${folderId}:${key}`] ?? { progressPercent: -1 }
  }

  const recalculateLocalStorageFolderSizes = React.useCallback(async () => {
    if (!indexedDb) {
      throw Error('Db not loaded.')
    }
    const result = await indexedDb.measureFolderSizes()
    setLocalStorageFolderSizes(result)
    return true
  }, [])

  const purgeLocalStorageForFolder = React.useCallback(
    async (folderId: string) => {
      if (!indexedDb) {
        throw Error('Db not loaded.')
      }
      const { result, err } = await indexedDb.purgeStorageForFolderId(folderId)
      if (err) {
        throw err
      }
      console.log('Deleted %s local files.', result.deletedCount)

      delete localStorageFolderSizes[folderId]
      setLocalStorageFolderSizes({
        ...localStorageFolderSizes,
        [folderId]: 0,
      })
      return true
    },
    [localStorageFolderSizes],
  )

  return (
    <LocalFileCacheContext.Provider
      value={{
        isLocal,
        getDataFromMemory,
        uploadFile,
        uploadingProgress,
        recalculateLocalStorageFolderSizes,
        purgeLocalStorageForFolder,
        localStorageFolderSizes,
        deleteFromMemory,
        getData,
        isDownloading,
        downloadToFile,
        downloadLocally,
        initialized: indexedDb?.initialized ?? false,
      }}
    >
      {children}
    </LocalFileCacheContext.Provider>
  )
}

export const useLocalFileCacheContext = (): ILocalFileCacheContext =>
  React.useContext(LocalFileCacheContext)
