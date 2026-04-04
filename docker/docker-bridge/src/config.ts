export interface DockerHostEntry {
  type: string // e.g. 'docker_endpoint'
  host: string // e.g. '/var/run/docker.sock' or 'http://remote:2375'
}

export interface BridgeConfig {
  httpPort: number
  wsPort: number
  bridgeApiSecret: string
  bridgeJwtSecret: string
  bridgeJwtExpiry: number // seconds
  dockerHosts: Record<string, DockerHostEntry>
  logLevel: string
  maxSessions: number
  maxConcurrentPerSession: number
  sessionIdleTimeout: number
  ephemeralGracePeriod: number
}

/**
 * Validate and parse an IPC init payload into a BridgeConfig.
 * Throws if required fields are missing or invalid.
 */
export function parseBridgeConfig(payload: unknown): BridgeConfig {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Invalid bridge config payload: expected an object')
  }

  const p = payload as Record<string, unknown>

  const bridgeApiSecret =
    typeof p.bridgeApiSecret === 'string' ? p.bridgeApiSecret : ''

  if (!bridgeApiSecret) {
    throw new Error('bridgeApiSecret must be set')
  }

  const dockerHosts = p.dockerHosts as
    | Record<string, DockerHostEntry>
    | undefined
  if (
    !dockerHosts ||
    typeof dockerHosts !== 'object' ||
    Object.keys(dockerHosts).length === 0
  ) {
    throw new Error('dockerHosts must define at least one host')
  }

  return {
    httpPort: typeof p.httpPort === 'number' ? p.httpPort : 3100,
    wsPort: typeof p.wsPort === 'number' ? p.wsPort : 3101,
    bridgeApiSecret,
    bridgeJwtSecret:
      typeof p.bridgeJwtSecret === 'string' ? p.bridgeJwtSecret : '',
    bridgeJwtExpiry:
      typeof p.bridgeJwtExpiry === 'number' ? p.bridgeJwtExpiry : 3600,
    dockerHosts,
    logLevel: typeof p.logLevel === 'string' ? p.logLevel : 'info',
    maxSessions: typeof p.maxSessions === 'number' ? p.maxSessions : 200,
    maxConcurrentPerSession:
      typeof p.maxConcurrentPerSession === 'number'
        ? p.maxConcurrentPerSession
        : 100,
    sessionIdleTimeout:
      typeof p.sessionIdleTimeout === 'number' ? p.sessionIdleTimeout : 1800000,
    ephemeralGracePeriod:
      typeof p.ephemeralGracePeriod === 'number'
        ? p.ephemeralGracePeriod
        : 5000,
  }
}
