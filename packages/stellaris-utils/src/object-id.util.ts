export interface ObjectIdentifier {
  isMetadataIdentifier: boolean
  metadataHash?: string
  objectKey: string
}

const CONTENT_IDENTIFIER_PREFIX = 'content'
const METADATA_IDENTIFIER_PREFIX = 'metadata'

export class BadObjectIdentifierError extends Error {
  name = BadObjectIdentifierError.name
  constructor(objectIdentifier: string) {
    super(`Bad object identifier: "${objectIdentifier}"`)
  }
}

export const objectIdentifierToObjectKey = (
  objectIdentifier: string,
): ObjectIdentifier => {
  // metadata id example: `metadata:${objectKey}:${metadataObject.hash}`
  //  content id example: `content:${objectKey}`
  const isMetadataIdentifier = objectIdentifier.startsWith(
    `${METADATA_IDENTIFIER_PREFIX}:`,
  )
  const objectIdentifierParts = objectIdentifier.split(':')
  if (objectIdentifierParts.length < (isMetadataIdentifier ? 3 : 2)) {
    throw new BadObjectIdentifierError(objectIdentifier)
  }
  const objectKey = isMetadataIdentifier
    ? objectIdentifierParts.slice(1, objectIdentifierParts.length - 1).join(':')
    : objectIdentifier.slice(CONTENT_IDENTIFIER_PREFIX.length + 1)
  return {
    isMetadataIdentifier,
    metadataHash: objectIdentifierParts.at(-1),
    objectKey,
  }
}

export const toMetadataObjectIdentifier = (
  objectKey: string,
  metadataHash: string,
): string => {
  return `${METADATA_IDENTIFIER_PREFIX}:${objectKey}:${metadataHash}`
}
