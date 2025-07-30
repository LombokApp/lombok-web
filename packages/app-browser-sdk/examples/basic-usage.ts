import { AppBrowserSdk } from '@stellariscloud/app-browser-sdk'

// Example: Basic SDK usage in an iframe app
const sdk = new AppBrowserSdk({
  basePath: 'https://api.stellariscloud.com',
  appId: 'my-app',
  onTokenReceived: (token) => {
    console.log('Received token:', token)
  },
  onTokenRefreshed: (token) => {
    console.log('Token refreshed:', token)
  },
  onLogout: () => {
    console.log('User logged out')
  },
  onError: (error) => {
    console.error('SDK error:', error)
  }
})

// Initialize the SDK
async function initializeApp() {
  try {
    await sdk.initialize()
    console.log('SDK initialized successfully')
    
    // Use the API client
    const apiClient = sdk.getApiClient()
    const response = await apiClient.GET('/api/v1/users/me')
    console.log('User data:', response)
  } catch (error) {
    console.error('Failed to initialize SDK:', error)
  }
}

// Clean up when the app is destroyed
function cleanup() {
  sdk.destroy()
}

// Example: React hook usage
import { useAppBrowserSdk } from '@stellariscloud/app-browser-sdk'

function MyApp() {
  const { isInitialized, error, getApiClient } = useAppBrowserSdk({
    basePath: 'https://api.stellariscloud.com',
    appId: 'my-app',
    onTokenReceived: (token) => {
      console.log('Token received:', token)
    }
  })

  if (error) {
    return <div>Error: {error.message}</div>
  }

  if (!isInitialized) {
    return <div>Initializing...</div>
  }

  const handleApiCall = async () => {
    try {
      const apiClient = getApiClient()
      const response = await apiClient.GET('/api/v1/users/me')
      console.log('API response:', response)
    } catch (error) {
      console.error('API call failed:', error)
    }
  }

  return (
    <div>
      <button onClick={handleApiCall}>Call API</button>
    </div>
  )
} 