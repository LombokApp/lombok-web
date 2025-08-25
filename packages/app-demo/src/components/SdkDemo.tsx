import { useAppBrowserSdk } from '@lombokapp/app-browser-sdk'
import createClient from 'openapi-react-query'
import React from 'react'

export function SdkDemo() {
  const { isInitialized, apiClient, authState, executeWorkerScriptUrl } =
    useAppBrowserSdk()

  // Create hooks-based client from the SDK's API client
  const [$api] = React.useState(() => createClient(apiClient))

  // Worker script state
  const [workerLoading, setWorkerLoading] = React.useState(false)
  const [workerResponse, setWorkerResponse] = React.useState<{
    message: string
  }>()
  const [workerError, setWorkerError] = React.useState<string>()

  // Use the hooks-based API approach
  const viewerQuery = $api.useQuery(
    'get',
    '/api/v1/viewer',
    {},
    {
      enabled: isInitialized && authState.isAuthenticated,
    },
  )

  const handleCallWorkerScript = () => {
    setWorkerLoading(true)
    setWorkerError(undefined)
    setWorkerResponse(undefined)
    void (async () => {
      try {
        const response = await executeWorkerScriptUrl(
          {
            workerIdentifier: 'special_worker',
          },
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              message: 'Hello from the browser!',
              timestamp: new Date().toISOString(),
              testData: { foo: 'bar', numbers: [1, 2, 3] },
            }),
          },
        )

        if (response.ok) {
          const data = (await response.json()) as { message: string }
          setWorkerResponse(data)
        } else {
          setWorkerError(`HTTP ${response.status}: ${response.statusText}`)
        }
      } catch (error) {
        setWorkerError(error instanceof Error ? error.message : String(error))
      } finally {
        setWorkerLoading(false)
      }
    })()
  }

  if (!isInitialized) {
    return (
      <div className="rounded-lg border border-blue-500/20 bg-blue-500/10 p-4">
        <div className="flex items-center space-x-2">
          <div className="size-4 animate-spin rounded-full border-b-2 border-blue-400"></div>
          <span className="text-blue-400">Initializing SDK...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-6">
      <h3 className="mb-4 text-xl font-semibold text-white">
        {viewerQuery.isLoading ? 'Fetching...' : 'Authenticated User'}
      </h3>

      <div className="space-y-4">
        <div className="rounded-lg border border-white/10 bg-black/20 p-4">
          <pre className="overflow-auto text-sm text-green-400">
            {(viewerQuery.data && JSON.stringify(viewerQuery.data, null, 2)) ??
              '...'}
          </pre>
        </div>

        {/* Worker Script Demo Section */}
        <div className="border-t border-white/10 pt-4">
          <h4 className="mb-3 text-lg font-semibold text-white">
            Worker Script Demo
          </h4>

          <button
            onClick={handleCallWorkerScript}
            disabled={workerLoading || !authState.isAuthenticated}
            className="mb-4 rounded-lg bg-purple-600 px-4 py-2 text-white transition-colors hover:bg-purple-700 disabled:cursor-not-allowed disabled:bg-gray-600"
          >
            {workerLoading ? (
              <div className="flex items-center space-x-2">
                <div className="size-4 animate-spin rounded-full border-b-2 border-white"></div>
                <span>Calling special_worker...</span>
              </div>
            ) : (
              'Call special_worker'
            )}
          </button>

          {workerError && (
            <div className="mb-4 rounded-lg border border-red-500/20 bg-red-500/10 p-4">
              <div className="font-medium text-red-400">Worker Error:</div>
              <div className="mt-1 text-sm text-red-300">{workerError}</div>
            </div>
          )}

          {workerResponse && (
            <div className="rounded-lg border border-white/10 bg-black/20 p-4">
              <div className="mb-2 font-medium text-purple-400">
                Worker Response:
              </div>
              <pre className="overflow-auto text-sm text-green-400">
                {JSON.stringify(workerResponse, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
