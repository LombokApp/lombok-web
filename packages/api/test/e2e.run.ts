import Bun from 'bun'

const MODES = ['api', 'ui'] as const
type Mode = (typeof MODES)[number]

function isMode(s: string): s is Mode {
  return MODES.includes(s as Mode)
}

async function main() {
  const argv = Bun.argv.slice(2)
  const modeArg = argv[0] ?? ''
  const mode: Mode = isMode(modeArg) ? modeArg : 'api'
  const globArgs = isMode(modeArg) ? argv.slice(1) : argv

  const defaultGlob =
    mode === 'api' ? './**/*.e2e-spec.ts' : './**/*.ui-e2e-spec.ts'
  const args = globArgs.length > 0 ? globArgs : [defaultGlob]

  const expandedArgs: string[] = []

  const isApiTest = (path: string) => path.endsWith('.e2e-spec.ts')
  const isUiTest = (path: string) => path.endsWith('.ui-e2e-spec.ts')

  for (const arg of args) {
    const glob = new Bun.Glob(arg)
    let hadGlobMatch = false

    for await (const match of glob.scan('.')) {
      hadGlobMatch = true
      const matchesMode = mode === 'api' ? isApiTest(match) : isUiTest(match)

      if (matchesMode) {
        expandedArgs.push(match)
      } else if (
        (mode === 'api' && isUiTest(match)) ||
        (mode === 'ui' && isApiTest(match))
      ) {
        // eslint-disable-next-line no-console -- intentional user-facing warning
        console.warn(
          `[e2e.run] Skipping ${match} (does not match ${mode} mode)`,
        )
      }
    }

    if (!hadGlobMatch) {
      expandedArgs.push(arg)
    }
  }

  await Bun.spawn(['bun', 'install'], {
    stdout: 'inherit',
    stderr: 'inherit',
  }).exited

  await Bun.spawn(['bun', './test/e2e.setup.ts'], {
    stdout: 'inherit',
    stderr: 'inherit',
  }).exited

  if (mode === 'ui') {
    await Bun.spawn(['bun', 'run', '--cwd', '../ui', 'build'], {
      stdout: 'inherit',
      stderr: 'inherit',
    }).exited
  }

  await Bun.spawn(['bun', 'test', ...expandedArgs], {
    stdout: 'inherit',
    stderr: 'inherit',
  }).exited
}

void main()
