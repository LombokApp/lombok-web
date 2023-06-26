import type { AsyncOperation } from '@stellariscloud/types'
import { AsyncOpType } from '@stellariscloud/types'
import React from 'react'
import { v4 as uuidV4 } from 'uuid'

import { authenticator } from '../pages/_app'
import { indexedDb } from '../services/indexed-db'
import { getDataFromDisk } from '../services/local-cache/local-cache.service'
import { downloadData } from '../utils/file'
import type { LogLine } from './logging.context'
import { useLoggingContext } from './logging.context'

export interface LocalFileCache {
  [key: string]: { size: number; type: string }
}

export class FileCacheError extends Error {}

export interface ILocalFileCacheContext {
  error?: FileCacheError
  isLocal: (folderId: string, key: string) => Promise<boolean>
  isDownloading: (
    folderId: string,
    objectKey: string,
  ) => { progressPercent: number }
  getData: (
    folderId: string,
    objectKey: string,
  ) => Promise<{ dataURL: string; type: string } | undefined>
  downloadLocally: (
    folderId: string,
    key: string,
  ) => Promise<{ dataURL: string }>
  downloadToFile: (folderId: string, objectKey: string) => void
  uploadFile: (folderId: string, objectKey: string, file: File) => void
  regenerateObjectPreviews: (folderId: string, key: string) => Promise<boolean>
  localStorageFolderSizes: { [key: string]: number }
  purgeLocalStorageForFolder: (folderId: string) => Promise<boolean>
  recalculateLocalStorageFolderSizes: () => Promise<boolean>
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

type WorkerMessage = [string, any]
interface AsyncOperationContext {
  operation: AsyncOperation
  resolve: (success: boolean) => void
  reject: (e: any) => void
}

interface AyncOperationsContextMap {
  [key: string]: AsyncOperationContext | undefined
}

interface DownloadingContext {
  progressPercent: number
  resolve: ({ dataURL }: { dataURL: string; type: string }) => void
  reject: (e: any) => void
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
  const operations = React.useRef<AyncOperationsContextMap>({})
  const workerRef = React.useRef<Worker>()
  const fileCacheRef = React.useRef<{
    [key: string]: { dataURL: string; type: string } | undefined
  }>({})
  const loggingContext = useLoggingContext()

  const addDataToMemory = React.useCallback(
    (
      folderId: string,
      objectKey: string,
      data: { dataURL: string; type: string },
    ) => {
      // console.log('addFileToMemory(%s, %s, ...)', folderId, objectKey)
      fileCacheRef.current[`${folderId}:${objectKey}`] = data
      return fileCacheRef.current[`${folderId}:${objectKey}`] as {
        dataURL: string
        type: string
      }
    },
    [],
  )

  const getDataFromMemory = React.useCallback(
    (folderId: string, objectKey: string) => {
      // console.log('getFileFromMemory(%s, %s)', folderId, objectKey)
      return fileCacheRef.current[`${folderId}:${objectKey}`]
    },
    [],
  )

  const deleteFromMemory = React.useCallback(
    (folderId: string, objectKey: string) => {
      // console.log('deleteFromMemory(%s, %s)', folderId, objectKey)
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete fileCacheRef.current[`${folderId}:${objectKey}`]
    },
    [],
  )

  React.useEffect(() => {
    if (!workerRef.current) {
      workerRef.current = new Worker(new URL('../worker.ts', import.meta.url))

      authenticator.addEventListener('onStateChanged', () => {
        void authenticator
          .getAccessToken()
          .then((t) => workerRef.current?.postMessage(['AUTH_UPDATED', t]))
      })
      void authenticator
        .getAccessToken()
        .then((t) =>
          workerRef.current?.postMessage([
            'INIT',
            { accessToken: t, host: document.location.origin },
          ]),
        )

      workerRef.current.addEventListener(
        'message',
        (event: MessageEvent<WorkerMessage>) => {
          // console.log('MESSSAGE FROM WORKER:', event)
          if (
            ['DOWNLOAD_COMPLETED', 'DOWNLOAD_FAILED'].includes(event.data[0])
          ) {
            const folderId: string = event.data[1].folderId
            const objectKey: string = event.data[1].objectKey
            const folderIdAndKey = `${folderId}:${objectKey}`
            if (event.data[0] === 'DOWNLOAD_FAILED') {
              downloading.current[folderIdAndKey]?.reject(
                `Failed downloading file: ${JSON.stringify(
                  event.data,
                  null,
                  2,
                )}`,
              )
              // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
              delete downloading.current[folderIdAndKey]
            } else {
              void getDataFromDisk(folderId, objectKey).then((data) => {
                if (data?.dataURL) {
                  addDataToMemory(folderId, objectKey, data)
                  // console.log('blob from disk:', blob, downloading.current)
                  downloading.current[folderIdAndKey]?.resolve(data)
                } else {
                  downloading.current[folderIdAndKey]?.reject(
                    `Failed to load data "${objectKey}" from disk.`,
                  )
                }
                // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
                delete downloading.current[folderIdAndKey]
              })
            }
          } else if (
            ['OPERATION_COMPLETED', 'OPERATION_FAILED'].includes(event.data[0])
          ) {
            // const folderId: string = event.data[1].folderId
            const operationId: string = event.data[1]
            if (event.data[0] === 'OPERATION_FAILED') {
              operations.current[operationId]?.reject(
                `Failed operation: ${operationId}`,
              )
              // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
              delete operations.current[operationId]
            } else {
              operations.current[operationId]?.resolve(true)
              // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
              delete operations.current[operationId]
            }
          } else if (event.data[0] === 'LOG_MESSAGE') {
            // const folderId: string = event.data[1].folderId
            const line: LogLine = event.data[1]
            loggingContext.appendLogLine({
              ...line,
              remote: false,
            })
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
  }, [downloading, loggingContext, addDataToMemory])

  const downloadLocally = React.useCallback(
    (folderId: string, objectKey: string) => {
      return new Promise(
        (
          resolve: (result: { dataURL: string; type: string }) => void,
          reject,
        ) => {
          const folderIdAndKey = `${folderId}:${objectKey}`
          if (downloading.current[folderIdAndKey]) {
            const oldResolve = downloading.current[folderIdAndKey]?.resolve as (
              blob: any,
            ) => void
            const oldReject = downloading.current[folderIdAndKey]?.reject as (
              e: any,
            ) => void
            // eslint-disable-next-line @typescript-eslint/non-nullable-type-assertion-style
            const downloadingContext = downloading.current[
              folderIdAndKey
            ] as DownloadingContext
            downloadingContext.resolve = (result) => {
              resolve(result)
              oldResolve(result)
            }
            downloadingContext.reject = (e) => {
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
              { folderId, objectKey },
            ])
          }
        },
      )
    },
    [downloading],
  )

  const getData = React.useCallback(
    async (folderId: string, objectKey: string) => {
      let result: { dataURL: string; type: string } | undefined
      result = getDataFromMemory(folderId, objectKey)
      // console.log('result from memory:', result)
      if (!result) {
        const data = await getDataFromDisk(folderId, objectKey)
        if (data) {
          result = addDataToMemory(folderId, objectKey, data)
        }

        // console.log('blob from disk:', blob)
      }
      if (!result) {
        // blob = await getFileBlobFromDisk(folderId, k)
        result = await downloadLocally(folderId, objectKey)
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
        { folderId, objectKey, uploadFile: file },
      ])
    },
    [],
  )

  const downloadToFile = React.useCallback(
    (folderId: string, objectKey: string) => {
      void getData(folderId, objectKey).then((f) => {
        const splitKey = objectKey.split('/')
        const filename = splitKey[splitKey.length - 1]
        downloadData(f.dataURL, filename)
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
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete localStorageFolderSizes[folderId]
      setLocalStorageFolderSizes({
        ...localStorageFolderSizes,
        [folderId]: 0,
      })
      return true
    },
    [localStorageFolderSizes],
  )

  const regenerateObjectPreviews = React.useCallback(
    async (folderId: string, objectKey: string) => {
      return new Promise((resolve: (success: boolean) => void, reject) => {
        const operationId = uuidV4()
        const operation: AsyncOperation = {
          id: operationId,
          inputs: [
            {
              folderId,
              objectKey,
            },
          ],
          config: {},
          opType: AsyncOpType.GENERATE_OBJECT_PREVIEWS,
        }
        operations.current[operationId] = {
          operation,
          resolve,
          reject,
        }
        workerRef.current?.postMessage(['OPERATION', operation])
      })
    },
    [],
  )

  return (
    <LocalFileCacheContext.Provider
      value={{
        isLocal,
        getDataFromMemory,
        uploadFile,
        recalculateLocalStorageFolderSizes,
        purgeLocalStorageForFolder,
        localStorageFolderSizes,
        deleteFromMemory,
        getData,
        isDownloading,
        downloadToFile,
        downloadLocally,
        regenerateObjectPreviews,
        initialized: indexedDb?.initialized ?? false,
      }}
    >
      {children}
    </LocalFileCacheContext.Provider>
  )
}

export const useLocalFileCacheContext = (): ILocalFileCacheContext =>
  React.useContext(LocalFileCacheContext)
