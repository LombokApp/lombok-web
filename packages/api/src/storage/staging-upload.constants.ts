// Staged uploads live in the dedicated `uploads` system bucket (its name comes
// from `coreConfig.s3SystemBuckets.uploads`), so keys are `{tier}/{userId}/{uuid}`
// and the request path is always `/uploads/{tier}/...` — a known, anchored
// prefix nginx can match from the start. The bucket is created in
// packages/api/cmd/garage-provision.sh.

// Standard staging size tiers, in megabytes, on a 2^ scale. `0` means no limit.
// The tier integer is the leading segment of the staging key (`uploads/{tier}/...`)
// and what nginx keys off — so nginx never needs to know about feature purposes.
// Each tier needs a matching `location ~ ^/uploads/{tier}/` with
// `client_max_body_size {mb}m` (0 → unlimited) in packages/api/nginx/nginx.conf
// (the s3.{{PLATFORM_HOST}} server block). KEEP THE TWO IN SYNC.
export const STAGING_TIER_MB = [
  0, 1, 2, 4, 8, 16, 32, 64, 128, 256, 512, 1024,
] as const

export type StagingTierMb = (typeof STAGING_TIER_MB)[number]

// Each feature ("purpose") conforms to one standard tier. The client sends the
// purpose; the server picks the tier, so the client never names a raw size and
// the URL carries only the tier integer. Add a feature by adding an entry here.
export const STAGING_PURPOSE_TIER_MB = {
  'folder-icon': 1, // matches the 1 MB image-upload validator ceiling
  'user-avatar': 1,
  'server-icon': 1,
} as const satisfies Record<string, StagingTierMb>

export type StagingPurpose = keyof typeof STAGING_PURPOSE_TIER_MB

export const STAGING_PURPOSES = Object.keys(STAGING_PURPOSE_TIER_MB) as [
  StagingPurpose,
  ...StagingPurpose[],
]
