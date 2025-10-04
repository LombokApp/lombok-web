import React from 'react'

import { sdkInstance } from '../../services/api'
import { downloadData } from '../../utils/file'
import LombokWorker from '../../worker.ts?worker'
import type { LogLine } from '../logging'
import { useLoggingContext } from '../logging'
import { LocalFileCacheContext } from './local-file-cache.context'
import type {
  PresignedUrlGeneratingContextMap,
  WorkerMessage,
} from './local-file-cache.types'

export const LocalFileCacheContextProvider = ({
  children,
}: {
  children: React.ReactNode
}) => {
  const pendingPresignedDownloadUrlRequests =
    React.useRef<PresignedUrlGeneratingContextMap>({})
  const [uploadingProgress, setUploadingProgress] = React.useState<
    Record<string, number>
  >({})
  const workerRef = React.useRef<Worker>()

  const postMessage = React.useRef((message: WorkerMessage) => {
    workerRef.current?.postMessage(message)
  })
  const loggingContext = useLoggingContext()
  const updateWorkerWithAuth = React.useCallback(() => {
    void sdkInstance.authenticator.getAccessToken().then((t) => {
      postMessage.current([
        'AUTH_UPDATED',
        {
          basePath: import.meta.env.API_BASE_URL ?? window.location.origin,
          accessToken: t,
        },
      ])
    })
  }, [])

  React.useEffect(() => {
    if (!workerRef.current) {
      workerRef.current = new LombokWorker()
      sdkInstance.authenticator.addEventListener('onStateChanged', () => {
        updateWorkerWithAuth()
      })

      workerRef.current.addEventListener(
        'message',
        (event: MessageEvent<WorkerMessage>) => {
          if (event.data[0] === 'LOG_MESSAGE') {
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
          } else if (event.data[0] === 'REQUEST_AUTH_UPDATE') {
            updateWorkerWithAuth()
          } else if (event.data[0] === 'GOT_PRESIGNED_DOWNLOAD_URL') {
            const { folderId, objectIdentifier, url } = event.data[1] as {
              folderId: string
              objectIdentifier: string
              url: string
            }
            const folderIdAndKey = `${folderId}:${objectIdentifier}`
            pendingPresignedDownloadUrlRequests.current[
              folderIdAndKey
            ]?.resolve({ url })
            // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
            delete pendingPresignedDownloadUrlRequests.current[folderIdAndKey]
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
  }, [loggingContext, updateWorkerWithAuth])

  const getPresignedDownloadUrl = React.useCallback(
    async (folderId: string, objectIdentifier: string) => {
      return new Promise(
        (resolve: (result: { url: string }) => void, reject) => {
          const folderIdAndKey = `${folderId}:${objectIdentifier}`
          if (pendingPresignedDownloadUrlRequests.current[folderIdAndKey]) {
            const oldResolve = pendingPresignedDownloadUrlRequests.current[
              folderIdAndKey
            ].resolve as (blob: unknown) => void
            const oldReject = pendingPresignedDownloadUrlRequests.current[
              folderIdAndKey
            ].reject as (e: unknown) => void

            const fetchingContext =
              pendingPresignedDownloadUrlRequests.current[folderIdAndKey]
            fetchingContext.resolve = (result) => {
              resolve(result)
              oldResolve(result)
            }
            fetchingContext.reject = (e: unknown) => {
              // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
              reject(e)
              oldReject(e)
            }
          } else {
            pendingPresignedDownloadUrlRequests.current[folderIdAndKey] = {
              resolve,
              reject,
            }
            postMessage.current([
              'GET_PRESIGNED_DOWNLOAD_URL',
              { folderId, objectIdentifier },
            ])
          }
        },
      )
    },
    [],
  )

  const uploadFile = React.useCallback(
    (folderId: string, objectKey: string, file: File) => {
      postMessage.current([
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
      void getPresignedDownloadUrl(folderId, objectIdentifer).then((f) => {
        downloadData(f.url, downloadFilename)
      })
    },
    [getPresignedDownloadUrl],
  )

  return (
    <LocalFileCacheContext.Provider
      value={{
        uploadFile,
        uploadingProgress,
        downloadToFile,
        getPresignedDownloadUrl,
        initialized: true,
      }}
    >
      {children}
    </LocalFileCacheContext.Provider>
  )
}
