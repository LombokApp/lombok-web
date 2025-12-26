/**
 * Generates a random 6 character hexadecimal string to use as part of a unique app identifier.
 */
export function generateAppIdentifierSuffix(): string {
  // 3 bytes = 6 hex characters
  const bytes = new Uint8Array(3)
  crypto.getRandomValues(bytes)

  // Convert bytes to hex string
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}
