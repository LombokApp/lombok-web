export interface ObjectIdentifier {
  isMetadataIdentifier: boolean
  objectKey: string
}

const CONTENT_IDENTIFIER_PREFIX = 'content'
const METADATA_IDENTIFIER_PREFIX = 'metadata'

export const objectIdentifierToObjectKey = (
  objectIdentifier: string,
): ObjectIdentifier => {
  // metadata id example: `metadata:${objectKey}:${metadataObject.hash}`
  //  content id example: `content:${objectKey}`

  const objectIdentifierParts = objectIdentifier.split(':')
  const isMetadataIdentifier =
    objectIdentifierParts[0] === METADATA_IDENTIFIER_PREFIX
  const objectKey = isMetadataIdentifier
    ? objectIdentifierParts.slice(1).join(':')
    : objectIdentifier.slice(CONTENT_IDENTIFIER_PREFIX.length + 1)
  return {
    isMetadataIdentifier,
    objectKey,
  }
}

export const toMetadataObjectIdentifier = (
  objectKey: string,
  metadataHash: string,
): string => {
  return `${METADATA_IDENTIFIER_PREFIX}:${objectKey}:${metadataHash}`
}
