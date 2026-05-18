import crypto from 'crypto'

/**
 * Derives an 8-character hex app id from a slug and the app's position in
 * the install sequence of apps sharing that slug (0-based). Deterministic:
 * the first install of a given slug always produces the same id, the second
 * a different stable id, and so on.
 */
export function deriveAppId(slug: string, position: number): string {
  return crypto
    .createHash('sha256')
    .update(`${slug}:${position}`)
    .digest()
    .subarray(0, 4)
    .toString('hex')
}
