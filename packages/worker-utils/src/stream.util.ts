export async function readStreamToString(
  stream: ReadableStream<Uint8Array> | null,
): Promise<string> {
  if (!stream) {
    return ''
  }

  const reader = stream.getReader()
  const decoder = new TextDecoder()
  let result = ''
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  while (true) {
    const { value, done } = await reader.read()
    if (done) {
      break
    }
    result += decoder.decode(value, { stream: true })
  }
  result += decoder.decode() // flush remaining
  return result
}
