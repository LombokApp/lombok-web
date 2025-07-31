import { useAppBrowserSdk } from '@stellariscloud/app-browser-sdk'
import createClient from 'openapi-react-query'
import React from 'react'

export function SdkDemo() {
  const { isInitialized, apiClient, authState, executeWorkerScript } =
    useAppBrowserSdk()

  // Create hooks-based client from the SDK's API client
  const [$api] = React.useState(() => createClient(apiClient))

  // Worker script state
  const [workerLoading, setWorkerLoading] = React.useState(false)
  const [workerResponse, setWorkerResponse] = React.useState<any>(null)
  const [workerError, setWorkerError] = React.useState<string | null>(null)

  // Use the hooks-based API approach
  const viewerQuery = $api.useQuery(
    'get',
    '/api/v1/viewer',
    {},
    {
      enabled: isInitialized && authState.isAuthenticated,
    },
  )

  const handleCallWorkerScript = async () => {
    setWorkerLoading(true)
    setWorkerError(null)
    setWorkerResponse(null)

    try {
      const response = await executeWorkerScript('special_worker', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: 'Hello from the browser!',
          timestamp: new Date().toISOString(),
          testData: { foo: 'bar', numbers: [1, 2, 3] },
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setWorkerResponse(data)
      } else {
        setWorkerError(`HTTP ${response.status}: ${response.statusText}`)
      }
    } catch (error) {
      setWorkerError(error instanceof Error ? error.message : String(error))
    } finally {
      setWorkerLoading(false)
    }
  }

  if (!isInitialized) {
    return (
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-400"></div>
          <span className="text-blue-400">Initializing SDK...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white/5 border border-white/10 rounded-lg p-6">
      <h3 className="text-xl font-semibold text-white mb-4">
        {viewerQuery.isLoading ? 'Fetching...' : 'Authenticated User'}
      </h3>

      <div className="space-y-4">
        <div className="bg-black/20 border border-white/10 rounded-lg p-4">
          <pre className="text-green-400 text-sm overflow-auto">
            {(viewerQuery.data && JSON.stringify(viewerQuery.data, null, 2)) ??
              '...'}
          </pre>
        </div>

        {/* Worker Script Demo Section */}
        <div className="border-t border-white/10 pt-4">
          <h4 className="text-lg font-semibold text-white mb-3">
            Worker Script Demo
          </h4>

          <button
            onClick={handleCallWorkerScript}
            disabled={workerLoading || !authState.isAuthenticated}
            className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg transition-colors mb-4"
          >
            {workerLoading ? (
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Calling special_worker...</span>
              </div>
            ) : (
              'Call special_worker'
            )}
          </button>

          {workerError && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-4">
              <div className="text-red-400 font-medium">Worker Error:</div>
              <div className="text-red-300 text-sm mt-1">{workerError}</div>
            </div>
          )}

          {workerResponse && (
            <div className="bg-black/20 border border-white/10 rounded-lg p-4">
              <div className="text-purple-400 font-medium mb-2">
                Worker Response:
              </div>
              <pre className="text-green-400 text-sm overflow-auto">
                {JSON.stringify(workerResponse, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
