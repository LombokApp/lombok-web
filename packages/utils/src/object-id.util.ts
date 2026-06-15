import { z } from 'zod'

// A folder object can be addressed by its content or by one of its metadata
// variants. This is a discriminated union, validated at the API boundary —
// there is no string encoding to parse.
export const objectIdentifierSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('content'), objectKey: z.string().min(1) }),
  z.object({
    kind: z.literal('metadata'),
    objectKey: z.string().min(1),
    metadataHash: z.string().min(1),
  }),
])

export type ObjectIdentifier = z.infer<typeof objectIdentifierSchema>

export const contentIdentifier = (objectKey: string): ObjectIdentifier => ({
  kind: 'content',
  objectKey,
})

export const metadataIdentifier = (
  objectKey: string,
  metadataHash: string,
): ObjectIdentifier => ({ kind: 'metadata', objectKey, metadataHash })

// Stable string key for an identifier, for use as a cache/map key. Not a wire
// format — the wire payload is the ObjectIdentifier object itself.
export const objectIdentifierKey = (id: ObjectIdentifier): string =>
  id.kind === 'metadata'
    ? `metadata:${id.objectKey}:${id.metadataHash}`
    : `content:${id.objectKey}`

// Joins a storage-location prefix with a relative key, normalising the slash.
export const joinStoragePrefix = (prefix: string, key: string): string =>
  prefix.length === 0 || prefix.endsWith('/')
    ? `${prefix}${key}`
    : `${prefix}/${key}`
