import { useAppBrowserSdk } from '@stellariscloud/app-browser-sdk'
import createClient from 'openapi-react-query'
import React from 'react'

export function SdkDemo() {
  const { isInitialized, apiClient, authState, error } = useAppBrowserSdk({
    onError: (error: Error) => {
      console.error('SDK error:', error)
    },
  })

  // Create hooks-based client from the SDK's API client
  const [$api] = React.useState(() => createClient(apiClient))

  // Use the hooks-based API approach
  const viewerQuery = $api.useQuery(
    'get',
    '/api/v1/viewer',
    {},
    {
      enabled: isInitialized && authState.isAuthenticated,
    },
  )

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
        <h3 className="text-red-400 font-semibold mb-2">SDK Error</h3>
        <p className="text-red-300">{error.message}</p>
      </div>
    )
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
      <h3 className="text-xl font-semibold text-white mb-4">SDK Demo</h3>

      <div className="space-y-4">
        {viewerQuery.data && (
          <div className="bg-black/20 border border-white/10 rounded-lg p-4">
            <h4 className="text-white font-semibold mb-2">
              Authenticated User:
            </h4>
            <pre className="text-green-400 text-sm overflow-auto">
              {JSON.stringify(viewerQuery.data, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  )
}
