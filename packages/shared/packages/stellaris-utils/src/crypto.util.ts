export const sha256String = async (input: string) => {
  const myDigest = await crypto.subtle.digest(
    {
      name: 'SHA-256',
    },
    new TextEncoder().encode(input),
  )
  return new TextDecoder().decode(myDigest)
}
