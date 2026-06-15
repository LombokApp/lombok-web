// Canonical key layout for an app's server-storage partition; signing and listing paths both build through here so they can't diverge.
//   app-runtime-storage/{appId}/shared/{objectKey}          (userId omitted)
//   app-runtime-storage/{appId}/users/{userId}/{objectKey}  (userId present)

const normalizeServerPrefix = (serverPrefix: string | null): string => {
  if (!serverPrefix) {
    return ''
  }
  return serverPrefix.endsWith('/') ? serverPrefix : `${serverPrefix}/`
}

export function buildAppStoragePartitionPrefix({
  serverPrefix,
  appIdentifier,
  userId,
}: {
  serverPrefix: string | null
  appIdentifier: string
  userId?: string
}): string {
  const scope = userId ? `users/${userId}` : 'shared'
  return `${normalizeServerPrefix(serverPrefix)}app-runtime-storage/${appIdentifier}/${scope}/`
}

export function buildAppStorageObjectKey({
  serverPrefix,
  appIdentifier,
  userId,
  objectKey,
}: {
  serverPrefix: string | null
  appIdentifier: string
  userId?: string
  objectKey: string
}): string {
  const partition = buildAppStoragePartitionPrefix({
    serverPrefix,
    appIdentifier,
    userId,
  })
  return `${partition}${objectKey.startsWith('/') ? objectKey.slice(1) : objectKey}`
}
