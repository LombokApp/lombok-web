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

export type ExifToolMetadata = Record<string, unknown>

export async function readFileMetadata(
  filePath: string,
  metadataFilePath: string,
): Promise<ExifToolMetadata> {
  const child = spawn(
    [
      'exiftool',
      '-b',
      '-json',
      '-x',
      'File:all',
      '-x',
      'ExifTool:all',
      filePath,
    ],
    {
      stdout: Bun.file(metadataFilePath),
      stderr: 'pipe',
    },
  )

  const stderrText = await readStreamToString(child.stderr)

  const exitCode = await child.exited

  if (exitCode !== 0) {
    const errorMessage =
      stderrText.trim() || 'Failed to read metadata with exiftool'
    throw new Error(errorMessage)
  }

  try {
    const parsed = JSON.parse(
      await fs.promises.readFile(metadataFilePath, 'utf-8'),
    ) as unknown
    if (
      Array.isArray(parsed) &&
      parsed.length > 0 &&
      typeof parsed[0] === 'object'
    ) {
      return parsed[0] as ExifToolMetadata
    }
    throw new Error('Unexpected exiftool output format')
  } catch (err) {
    const details = err instanceof Error ? err.message : String(err)
    throw new Error(`Failed to parse exiftool output: ${details}`)
  }
}
