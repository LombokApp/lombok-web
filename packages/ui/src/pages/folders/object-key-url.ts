// Recover the object key from the raw (still-encoded) pathname with exactly one
// decode. We can't use the splat param: react-router decodes it twice, which
// collapses a literal "%2F" in the key into a real "/" — losing the distinction
// between key "a/b" and key "a%2Fb".
export function recoverObjectKey(pathname: string): string | undefined {
  const match = /^\/folders\/[^/]+\/objects\/(.+)$/.exec(pathname)
  if (!match) {
    return undefined
  }
  try {
    return decodeURIComponent(match[1] ?? '')
  } catch {
    return match[1]
  }
}
