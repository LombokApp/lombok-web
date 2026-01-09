import fs from 'fs'
import path from 'path'

/**
 * Alternative: Send a file change signal to trigger watch mode restart
 */
export function triggerWatchModeRestart(): void {
  // Touch the specific file that Bun is watching (from package.json: "bun --watch --bun src/main.ts")

  // This is the main file, which bun is definitely watching
  const fileToTouch = path.join(__dirname, '../src/main.ts')

  try {
    if (fs.existsSync(fileToTouch)) {
      // Read the file content first
      const content = fs.readFileSync(fileToTouch, 'utf8')
      // Write it back to trigger file change
      fs.writeFileSync(fileToTouch, content)
      // eslint-disable-next-line no-console
      console.log(`Touched file: ${fileToTouch}`)
    } else {
      // eslint-disable-next-line no-console
      console.log(`File does not exist: ${fileToTouch}`)
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.log(`Could not touch ${fileToTouch}:`, error)
  }

  // eslint-disable-next-line no-console
  console.log('Triggered watch mode restart by touching files')
}

if (require.main === module) {
  triggerWatchModeRestart()
}
