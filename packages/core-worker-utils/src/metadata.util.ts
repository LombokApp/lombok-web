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
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          metadata[tagName!] = {
            type: type ?? '',
            count: parseInt(count ?? '0', 10),
            value: value?.trim() ?? '',
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

export function parseOrientationToNumeric(orientation: string): number {
  if (!orientation) {
    return 0
  }

  // Handle Exif orientation descriptions like "right, top", "bottom, left", etc.
  // These values represent the degrees of rotation needed to correct the image orientation
  const exifOrientationMap: Record<string, number> = {
    'top, left': 0, // Already correct, no rotation needed
    'top, right': 1, // Flipped horizontally, but no rotation needed
    'bottom, right': 2, // Upside down, rotate 180° to correct
    'bottom, left': 3, // Upside down and flipped, rotate 180° to correct
    'left, top': 4, // Rotated 90° CCW, rotate 90° CW to correct
    'right, top': 5, // Rotated 90° CW, rotate 90° CW to correct
    'right, bottom': 6, // Rotated 270° CW, rotate 270° CW to correct
    'left, bottom': 7, // Rotated 270° CW, rotate 270° CW to correct
  }

  // Check if it's an Exif orientation description
  const normalizedOrientation = orientation.toLowerCase().trim()
  if (normalizedOrientation in exifOrientationMap) {
    return exifOrientationMap[normalizedOrientation] ?? 0
  }

  // Fallback: Extract the rotation value from the orientation string (legacy format)
  const rotationMatch = orientation.match(/Rotate (\d+) (CW|CCW)/)
  if (!rotationMatch) {
    return 0
  }

  const degrees = parseInt(rotationMatch[1] ?? '0', 10)
  const direction = rotationMatch[2]

  // Convert to position number (0-359)
  let position = 0
  if (direction === 'CW') {
    position = degrees
  } else if (direction === 'CCW') {
    position = 360 - degrees
  }

  // Ensure the position is within 0-359
  return Math.min(Math.max(position, 0), 359)
}

export function parseNumericOrientationValueFromMetadata(
  metadata: Exiv2Metadata,
): number {
  if (
    typeof metadata === 'object' &&
    typeof metadata['Exif.Image.Orientation'] === 'object' &&
    typeof metadata['Exif.Image.Orientation'].value === 'string'
  ) {
    // Orientation: "right, top",
    return parseOrientationToNumeric(metadata['Exif.Image.Orientation'].value)
  }
  return 0
}
