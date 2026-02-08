import Bun from 'bun'

async function main() {
  const globArgs = Bun.argv.slice(2)

  const defaultGlob = './**/*.unit-spec.ts'
  const args = globArgs.length > 0 ? globArgs : [defaultGlob]

  const expandedArgs: string[] = []

  for (const arg of args) {
    const glob = new Bun.Glob(arg)
    let hadGlobMatch = false

    for await (const match of glob.scan('.')) {
      hadGlobMatch = true
      expandedArgs.push(match)
    }

    if (!hadGlobMatch) {
      expandedArgs.push(arg)
    }
  }

  const testResult = await Bun.spawn(['bun', 'test', ...expandedArgs], {
    stdout: 'inherit',
    stderr: 'inherit',
  }).exited

  process.exit(testResult)
}

await main()
