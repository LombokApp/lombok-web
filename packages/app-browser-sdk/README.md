# @stellariscloud/app-browser-sdk

A browser SDK for StellarisCloud iframe applications that provides automatic communication with the parent window, token management, and API client access.

## Features

- **Automatic Iframe Communication**: Secure communication between iframe and parent window with automatic initialization
- **Token Management**: Automatic handling of authentication tokens received from parent
- **API Client**: Direct access to pre-configured StellarisCloud API client
- **React Hooks**: Easy integration with React applications including auth state management
- **URL-based Configuration**: Automatic base path detection from URL parameters

## Installation

```bash
npm install @stellariscloud/app-browser-sdk
```

## Usage

### Basic Usage

```typescript
import { AppBrowserSdk } from '@stellariscloud/app-browser-sdk'

const sdk = new AppBrowserSdk({
  onInitialize: () => {
    console.log('SDK initialized and ready')
  },
  onError: (error) => {
    console.error('SDK error:', error)
  },
  onLogout: () => {
    console.log('Logout event received')
  },
})

// The SDK automatically initializes when created
// Access the API client directly
const response = await sdk.apiClient.GET('/api/v1/users/me')

// Access the authenticator for auth state
console.log('Auth state:', sdk.authenticator.state)

// Check if initialized
if (sdk.isInitialized) {
  console.log('SDK is ready')
}
```

### React Hook Usage

```typescript
import { useAppBrowserSdk } from '@stellariscloud/app-browser-sdk'

function MyApp() {
  const { isInitialized, error, apiClient, authState } = useAppBrowserSdk({
    onInitialize: () => {
      console.log('SDK initialized in React')
    },
    onError: (error) => {
      console.error('SDK error:', error)
    }
  })

  if (error) {
    return <div>Error: {error.message}</div>
  }

  if (!isInitialized) {
    return <div>Initializing...</div>
  }

  const handleApiCall = async () => {
    const response = await apiClient.GET('/api/v1/users/me')
    console.log(response)
  }

  return (
    <div>
      <div>Auth State: {authState}</div>
      <button onClick={handleApiCall}>Call API</button>
    </div>
  )
}
```

## API Reference

### AppBrowserSdk

The main SDK class that automatically handles iframe communication, token management, and API client instantiation.

#### Constructor

```typescript
new AppBrowserSdk(config?: AppBrowserSdkConfig)
```

#### Configuration

```typescript
interface AppBrowserSdkConfig {
  onInitialize?: () => void
  onLogout?: () => void
  onError?: (error: Error) => void
}
```

#### Properties

- `apiClient` - Direct access to the StellarisCloud API client
- `authenticator` - Access to the authenticator instance for auth state management
- `isInitialized: boolean` - Whether the SDK has received initial authentication
- `communicator: Promise<IframeCommunicator>` - Promise that resolves to the iframe communicator

#### Methods

- `destroy(): void` - Clean up resources and reset state

### useAppBrowserSdk Hook

A React hook that provides easy access to the SDK with state management.

#### Parameters

```typescript
useAppBrowserSdk(config?: AppBrowserSdkConfig)
```

#### Returns

```typescript
{
  isInitialized: boolean
  error: Error | undefined
  apiClient: StellarisApiClient
  authState: AuthenticatorStateType
}
```

### IframeCommunicator

Low-level communication interface (usually not needed directly).

#### Methods

- `sendMessage(message: IframeMessage): void` - Send message to parent
- `onMessage(type: string, handler: (message: IframeMessage) => void): void` - Register message handler
- `offMessage(type: string): void` - Unregister message handler
- `notifyReady(): void` - Notify parent that iframe is ready
- `notifyError(error: Error): void` - Notify parent of an error

### Base Path

The API base path is automatically determined from URL parameters:

- Checks for `basePath` URL parameter
- Falls back to `http://localhost:3000` if not provided

Example URL: `https://your-app.com/iframe?basePath=https://api.stellariscloud.com`

## Message Protocol

The SDK automatically handles communication with the parent window using these message types:

### From iframe to parent:

- `APP_READY` - Notify parent that iframe application is ready
- `APP_ERROR` - Report error to parent with error details

### From parent to iframe:

- `AUTHENTICATION` - Provide authentication tokens to iframe
- `LOGOUT` - Notify iframe to handle logout
- `ERROR` - Report error from parent to iframe

## Token Management

Tokens are automatically managed by the SDK:

- Received from parent window via `AUTHENTICATION` message
- Automatically provided to API client for requests
- Stored in memory and shared across SDK instances
- Cleared on logout or destroy

## Development

```bash
# Install dependencies
bun install

# Build the package
bun run build:clean

# Type checking
bun run tsc:check

# Linting
bun run lint:check
```

## Dependencies

- `@stellariscloud/sdk` - Core StellarisCloud SDK
- `@stellariscloud/auth-utils` - Authentication utilities
- `@stellariscloud/types` - Shared type definitions
- React 18+ (peer dependency for hooks)
