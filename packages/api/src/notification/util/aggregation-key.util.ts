import { createHash } from 'crypto'

/**
 * Builds a deterministic aggregation key from event properties.
 * The aggregation key is used to group events for batching and notification generation.
 *
 * @param emitterIdentifier - The emitter identifier
 * @param eventIdentifier - The event identifier
 * @param targetLocationFolderId - The folder ID where the event occurred (nullable)
 * @param targetLocationObjectKey - The object key within the folder (nullable, will be hashed)
 * @param targetUserId - The target user ID (nullable)
 * @returns A deterministic aggregation key string
 */
export function buildAggregationKey(
  emitterIdentifier: string,
  eventIdentifier: string,
  targetLocationFolderId: string | null,
  targetLocationObjectKey: string | null,
): string {
  // Hash the object key if present for consistent length
  const hashedObjectKey = targetLocationObjectKey
    ? createHash('sha256').update(targetLocationObjectKey).digest('hex')
    : ''

  // Build key parts, using empty string for null values
  const parts = [
    `${emitterIdentifier}:${eventIdentifier}`,
    targetLocationFolderId ?? '',
    hashedObjectKey,
  ]

  // Join with colons to create deterministic key
  return parts.join(':')
}
