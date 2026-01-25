/**
 * Parses a Docker image reference and extracts the registry URL.
 *
 * Docker image references follow these patterns:
 * - `registry[:port]/repository[:tag]` - for custom registries
 * - `repository[:tag]` - for Docker Hub (default registry)
 *
 * Examples:
 * - `nginx:latest` -> `docker.io`
 * - `ghcr.io/lombokapp/lombok:latest` -> `ghcr.io`
 * - `localhost:5000/myimage:tag` -> `localhost:5000`
 * - `myuser/myimage:tag` -> `docker.io` (no dot or colon before first slash)
 *
 * @param image - The Docker image reference (e.g., "ghcr.io/lombokapp/lombok:latest")
 * @returns The registry URL (e.g., "ghcr.io" or "docker.io")
 */
export function parseRegistryFromImage(image: string): string {
  // Split by '/' to separate registry from repository
  const parts = image.split('/')

  if (parts.length === 1) {
    // No slash means it's a Docker Hub image (e.g., "nginx" or "nginx:latest")
    return 'docker.io'
  }

  // Check if the first part contains a dot or colon (indicates a registry)
  // Note: we check the first part before any tag removal to preserve ports
  const firstPart = parts[0]
  if (firstPart && (firstPart.includes('.') || firstPart.includes(':'))) {
    // This is a registry (e.g., "ghcr.io" or "localhost:5000")
    // The registry part may include a port, so we return it as-is
    return firstPart
  }

  // No registry specified, default to Docker Hub
  return 'docker.io'
}
