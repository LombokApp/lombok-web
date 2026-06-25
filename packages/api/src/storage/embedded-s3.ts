import type {
  ServerStorageWithSecret,
  StorageProvisionWithSecret,
} from '@lombokapp/types'

import { buildPlatformOrigin } from '../core/utils/platform-origin.util'
import { buildAccessKeyHashId } from './access-key.utils'

// The embedded Garage daemon listens here; all server-side S3 traffic is
// rewritten to this loopback address (topology-independent — works behind
// fronted TLS and on arbitrary public ports).
const INTERNAL_ENDPOINT = 'http://127.0.0.1:9000'

export interface EmbeddedS3Config {
  accessKeyId: string
  secretAccessKey: string
  region: string
  /** Public browser-facing endpoint, e.g. https://s3.example.com:8090 */
  endpoint: string
  /** Host portion of `endpoint` (incl. port) for the internal-rewrite check. */
  publicHost: string
}

let memoized: { value: EmbeddedS3Config | undefined } | undefined

/** Test-only: drop the memoized config so a different env can be exercised. */
export function resetEmbeddedS3ConfigCacheForTest(): void {
  memoized = undefined
}

/**
 * Resolve the embedded builtin S3 config from env (set by the entrypoint after
 * Garage provisioning). The embedded Garage service is the single S3 backend in
 * every environment — credentials are auto-generated and exported by the
 * entrypoint (prod/dev/test). System bucket names come from coreConfig, not
 * here. Returns undefined only when credentials/host are absent.
 */
export function getEmbeddedS3Config(): EmbeddedS3Config | undefined {
  if (memoized) {
    return memoized.value
  }

  const accessKeyId = process.env.EMBEDDED_S3_ACCESS_KEY_ID
  const secretAccessKey = process.env.EMBEDDED_S3_SECRET_ACCESS_KEY
  const platformHost = process.env.PLATFORM_HOST

  if (!accessKeyId || !secretAccessKey || !platformHost) {
    memoized = { value: undefined }
    return undefined
  }

  const region = process.env.EMBEDDED_S3_REGION ?? 'auto'
  // Normally derived from the platform host/port. The e2e harness pins it via
  // EMBEDDED_S3_ENDPOINT because its nginx serves S3 on a different port than the
  // logical platform port; prod/dev leave it unset and derive the origin.
  const endpoint =
    process.env.EMBEDDED_S3_ENDPOINT ??
    buildPlatformOrigin({
      platformHost: `s3.${platformHost}`,
      platformHttps:
        process.env.PLATFORM_HTTPS !== 'false' &&
        process.env.PLATFORM_HTTPS !== '0',
      platformPort: process.env.PLATFORM_PORT
        ? parseInt(process.env.PLATFORM_PORT, 10)
        : null,
    })

  memoized = {
    value: {
      accessKeyId,
      secretAccessKey,
      region,
      endpoint,
      publicHost: new URL(endpoint).host,
    },
  }
  return memoized.value
}

/**
 * The virtual builtin server storage (platform's own app/icon/avatar storage).
 * Lives in its own dedicated bucket (`serverStorageBucket`), so no prefix is
 * needed to namespace it.
 */
export function buildEmbeddedServerStorage(
  serverStorageBucket: string,
): ServerStorageWithSecret | undefined {
  const config = getEmbeddedS3Config()
  if (!config) {
    return undefined
  }
  return {
    accessKeyId: config.accessKeyId,
    secretAccessKey: config.secretAccessKey,
    endpoint: config.endpoint,
    bucket: serverStorageBucket,
    region: config.region,
    prefix: null,
    accessKeyHashId: buildAccessKeyHashId({
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
      region: config.region,
      endpoint: config.endpoint,
    }),
  }
}

/**
 * The virtual builtin storage provision users can pick when creating folders.
 * Backed by the dedicated `provisionsBucket`.
 */
export function buildEmbeddedStorageProvision(
  provisionsBucket: string,
  provisionContext?: { folderId: string; userId: string },
): Omit<StorageProvisionWithSecret, 'id' | 'userId'> | undefined {
  const config = getEmbeddedS3Config()
  if (!config) {
    return undefined
  }
  const prefix = provisionContext
    ? `.lombok_provision__user_${provisionContext.userId}_folder_${provisionContext.folderId}`
    : null

  return {
    accessKeyId: config.accessKeyId,
    secretAccessKey: config.secretAccessKey,
    endpoint: config.endpoint,
    bucket: provisionsBucket,
    region: config.region,
    prefix,
    // No REDUNDANCY: a single local node can't serve as a redundancy target.
    provisionTypes: ['CONTENT', 'METADATA'],
    label: 'Built-in storage',
    description: 'Storage provided by this Lombok instance.',
    accessKeyHashId: buildAccessKeyHashId({
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
      region: config.region,
      endpoint: config.endpoint,
    }),
  }
}

/**
 * Rewrite a public embedded endpoint to the loopback Garage address for
 * server-side S3 calls. Non-embedded endpoints pass through unchanged.
 */
export function rewriteToInternalEndpoint(endpoint: string): string {
  const config = getEmbeddedS3Config()
  if (!config) {
    return endpoint
  }
  let host: string
  try {
    host = new URL(endpoint).host
  } catch {
    return endpoint
  }
  return host === config.publicHost ? INTERNAL_ENDPOINT : endpoint
}
