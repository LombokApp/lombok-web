# @stellariscloud/app-browser-sdk

A browser SDK for StellarisCloud iframe applications that provides communication with the parent window, token management, and API client instantiation.

## Features

- **Iframe Communication**: Secure communication between iframe and parent window
- **Token Management**: Automatic handling of authentication tokens
- **API Client**: Pre-configured StellarisCloud API client
- **React Hooks**: Easy integration with React applications

## Installation

```bash
npm install @stellariscloud/app-browser-sdk
```

## Usage

### Basic Usage

```typescript
import { AppBrowserSdk } from '@stellariscloud/app-browser-sdk'

const sdk = new AppBrowserSdk({
  basePath: 'https://api.stellariscloud.com',
  appId: 'your-app-id',
  onTokenReceived: (token) => {
    console.log('Token received:', token)
  },
  onError: (error) => {
    console.error('SDK error:', error)
  }
})

// Initialize the SDK
await sdk.initialize()

// Use the API client
const apiClient = sdk.getApiClient()
const response = await apiClient.GET('/api/v1/users/me')
```

### React Hook Usage

```typescript
import { useAppBrowserSdk } from '@stellariscloud/app-browser-sdk'

function MyApp() {
  const { isInitialized, error, getApiClient } = useAppBrowserSdk({
    basePath: 'https://api.stellariscloud.com',
    appId: 'your-app-id',
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
    const apiClient = getApiClient()
    const response = await apiClient.GET('/api/v1/users/me')
    console.log(response)
  }

  return (
    <div>
      <button onClick={handleApiCall}>Call API</button>
    </div>
  )
}
```

## API Reference

### AppBrowserSdk

The main SDK class that orchestrates iframe communication, token management, and API client instantiation.

#### Constructor

```typescript
new AppBrowserSdk(config: AppBrowserSdkConfig)
```

#### Configuration

```typescript
interface AppBrowserSdkConfig {
  basePath: string
  appId: string
  onTokenReceived?: (token: TokenData) => void
  onTokenRefreshed?: (token: TokenData) => void
  onLogout?: () => void
  onError?: (error: Error) => void
}
```

#### Methods

- `initialize(): Promise<void>` - Initialize the SDK and request initial token
- `destroy(): void` - Clean up resources
- `requestToken(): Promise<TokenData>` - Request a new token from parent
- `getApiClient()` - Get the configured API client
- `getAuthenticator()` - Get the authenticator instance

### useAppBrowserSdk Hook

A React hook that provides easy access to the SDK instance.

#### Parameters

```typescript
useAppBrowserSdk(config: AppBrowserSdkConfig)
```

#### Returns

```typescript
{
  isInitialized: boolean
  error: Error | null
  sdk: AppBrowserSdk | null
  requestToken: () => Promise<TokenData>
  getApiClient: () => any
  getAuthenticator: () => any
}
```

## Message Protocol

The SDK communicates with the parent window using the following message types:

### From iframe to parent:
- `IFRAME_READY` - Notify parent that iframe is ready
- `REQUEST_TOKEN` - Request authentication token
- `IFRAME_ERROR` - Report error to parent

### From parent to iframe:
- `TOKEN_RECEIVED` - Provide authentication token
- `TOKEN_REFRESHED` - Provide refreshed token
- `LOGOUT` - Notify iframe to logout
- `ERROR` - Report error to iframe

## Development

```bash
# Install dependencies
bun install

# Build the package
bun run build:clean

# Type checking
bun run ts:check

# Linting
bun run lint:check
``` 