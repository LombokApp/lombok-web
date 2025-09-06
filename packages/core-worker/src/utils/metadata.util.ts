import { spawn } from 'bun'
import fs from 'fs'

async function readStreamToString(
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
  result += decoder.decode()
  return result
}

export type Exiv2Metadata = Record<
  string,
  {
    type: string
    count: number
    value: string
  }
>

export async function readFileMetadata(
  filePath: string,
  metadataFilePath: string,
): Promise<Exiv2Metadata> {
  const child = spawn(['exiv2', '-pa', filePath], {
    stdout: 'pipe',
    stderr: 'pipe',
  })

  const stdoutText = await readStreamToString(child.stdout)
  const stderrText = await readStreamToString(child.stderr)

  const exitCode = await child.exited

  if (exitCode !== 0) {
    const errorMessage =
      stderrText.trim() || 'Failed to read metadata with exif2'
    throw new Error(errorMessage)
  }

  try {
    // Parse exiv2 structured output and convert to JSON
    const metadata: Exiv2Metadata = {}

    const lines = stdoutText.trim().split('\n')
    for (const line of lines) {
      if (line.trim()) {
        // Parse format: "TagName Type Count Value"
        const match = line.match(/^([^\s]+)\s+(\w+)\s+(\d+)\s+(.*)$/)
        if (match) {
          const [, tagName, type, count, value] = match
          metadata[tagName] = {
            type,
            count: parseInt(count, 10),
            value: value.trim(),
          }
        }
      }
    }

    // Write the parsed JSON to the metadata file
    await fs.promises.writeFile(
      metadataFilePath,
      JSON.stringify(metadata, null, 2),
      'utf-8',
    )

    return metadata
  } catch (err) {
    const details = err instanceof Error ? err.message : String(err)
    throw new Error(`Failed to parse exif2 output: ${details}`)
  }
}
