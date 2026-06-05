const port = window.location.port
const portSuffix = port && !['80', '443'].includes(port) ? `:${port}` : ''
const API_HOST = `${window.location.hostname}${portSuffix}`
const protocol = window.location.protocol

export function resolveAppAssetUrl(
  appIdentifier: string,
  assetPath: string,
): string {
  const normalized = assetPath.startsWith('/') ? assetPath : `/${assetPath}`
  return `${protocol}//app-server--${appIdentifier}.${API_HOST}${normalized}`
}
