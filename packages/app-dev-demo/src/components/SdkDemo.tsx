import { useAppBrowserSdk } from '@stellariscloud/app-browser-sdk'
import { useState } from 'react'

export function SdkDemo() {
  const [apiResponse, setApiResponse] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const { isInitialized, error, getApiClient, requestToken } = useAppBrowserSdk(
    {
      basePath: 'https://api.stellariscloud.com',
      appId: 'demo-app',
      onTokenReceived: (token: any) => {
        console.log('Token received:', token)
      },
      onError: (error: Error) => {
        console.error('SDK error:', error)
      },
    },
  )

  const handleApiCall = async () => {
    try {
      setLoading(true)
      const apiClient = getApiClient()
      const response = await apiClient.GET('/api/v1/viewer')
      setApiResponse(response)
    } catch (err) {
      console.error('API call failed:', err)
      setApiResponse({
        error: err instanceof Error ? err.message : 'Unknown error',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleRequestToken = async () => {
    try {
      setLoading(true)
      const token = await requestToken()
      setApiResponse({ token })
    } catch (err) {
      console.error('Token request failed:', err)
      setApiResponse({
        error: err instanceof Error ? err.message : 'Unknown error',
      })
    } finally {
      setLoading(false)
    }
  }

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
        <div className="flex space-x-4">
          <button
            onClick={handleApiCall}
            disabled={loading}
            className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold rounded-lg transition-all duration-200 disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'Call API'}
          </button>

          <button
            onClick={handleRequestToken}
            disabled={loading}
            className="px-4 py-2 border border-white/20 text-white hover:bg-white/10 font-semibold rounded-lg transition-all duration-200 disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'Request Token'}
          </button>
        </div>

        {apiResponse && (
          <div className="bg-black/20 border border-white/10 rounded-lg p-4">
            <h4 className="text-white font-semibold mb-2">Response:</h4>
            <pre className="text-green-400 text-sm overflow-auto">
              {JSON.stringify(apiResponse, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  )
}
