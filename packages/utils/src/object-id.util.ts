import { z } from 'zod'

// A folder object is addressed by content or by a metadata variant; validated at the API boundary, not string-encoded.
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

// Stable cache/map key, not a wire format (the wire payload is the ObjectIdentifier object).
export const objectIdentifierKey = (id: ObjectIdentifier): string =>
  id.kind === 'metadata'
    ? `metadata:${id.objectKey}:${id.metadataHash}`
    : `content:${id.objectKey}`

export const joinStoragePrefix = (prefix: string, key: string): string =>
  prefix.length === 0 || prefix.endsWith('/')
    ? `${prefix}${key}`
    : `${prefix}/${key}`
