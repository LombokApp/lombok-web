export interface PlatformOriginConfig {
  platformHost: string
  platformHttps: boolean
  platformPort?: number | null
}

/**
 * Build the platform origin URL (e.g. https://example.com:3000).
 * Omits port when it is 80 (http) or 443 (https).
 */
export function buildPlatformOrigin(config: PlatformOriginConfig): string {
  const protocol = config.platformHttps ? 'https' : 'http'
  const port =
    typeof config.platformPort === 'number' &&
    ![80, 443].includes(config.platformPort)
      ? `:${config.platformPort}`
      : ''
  return `${protocol}://${config.platformHost}${port}`
}
