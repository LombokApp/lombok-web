// Browser-URL encoding only: encode the key for use in a URL path while
// keeping real "/" separators readable (e.g. for navigation links).
export const encodeObjectKeyPreservingSlashes = (objectKey: string) => {
  return encodeURIComponent(objectKey).replace(/%2F/g, '/')
}

// Replace a literal "%2F" (any case) in a key with "_". "%2F" bytes inside a
// key are interpreted inconsistently across S3 providers when placed in a
// presigned URL, so we sanitize them at the boundaries where we create keys.
// Real "/" (legitimate nesting) is left untouched.
export const replaceEncodedForwardSlashes = (value: string): string =>
  value.replace(/%2f/gi, '_')

// Sanitize an upload filename (leaf only): replace both real "/" and literal
// "%2F" with "_". Idempotent.
export const sanitizeUploadFilename = (name: string): string =>
  name.replace(/%2f/gi, '_').replace(/\//g, '_')

// True if the value contains a literal "%2F" (any case). Used to reject such
// sequences in folder prefixes.
export const hasEncodedForwardSlash = (value: string): boolean =>
  /%2f/i.test(value)
