import { useAppBrowserSdk } from '@stellariscloud/app-browser-sdk'
import createClient from 'openapi-react-query'
import React from 'react'

export function SdkDemo() {
  const { isInitialized, apiClient, authState } = useAppBrowserSdk()

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
      </div>
    </div>
  )
}
