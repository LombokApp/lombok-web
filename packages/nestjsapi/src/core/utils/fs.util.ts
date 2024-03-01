import fs from 'fs'
import path from 'path'

export function readDirRecursive(startDirPath: string) {
  let results: string[] = []
  for (const filename of fs.readdirSync(startDirPath)) {
    const potentialFilePath = path.join(startDirPath, filename)
    if (fs.lstatSync(potentialFilePath).isDirectory()) {
      results = results.concat(readDirRecursive(potentialFilePath))
    } else {
      results.push(potentialFilePath)
    }
  }
  return results
}
