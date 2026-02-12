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

  const isUiMode = mode === 'ui'
  const isApiMode = mode === 'api'
  const defaultGlob = isApiMode ? './**/*.e2e-spec.ts' : './**/*.ui-e2e-spec.ts'
  const args = globArgs.length > 0 ? globArgs : [defaultGlob]

  const expandedArgs: string[] = []

  const isApiTest = (path: string) => path.endsWith('.e2e-spec.ts')
  const isUiTest = (path: string) => path.endsWith('.ui-e2e-spec.ts')

  for (const arg of args) {
    const glob = new Bun.Glob(arg)
    let hadGlobMatch = false

    for await (const match of glob.scan('.')) {
      hadGlobMatch = true
      const matchesMode = isApiMode ? isApiTest(match) : isUiTest(match)

      if (matchesMode) {
        expandedArgs.push(match)
      } else if (
        (mode === 'api' && isUiTest(match)) ||
        (isUiMode && isApiTest(match))
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

  await Bun.spawn(['bun', './test/e2e.setup.ts'], {
    stdout: 'inherit',
    stderr: 'inherit',
  }).exited

  // For ui mode, run each test file individually
  if (mode === 'ui') {
    const c = {
      reset: '\x1b[0m',
      bold: '\x1b[1m',
      dim: '\x1b[2m',
      red: '\x1b[31m',
      green: '\x1b[32m',
      yellow: '\x1b[33m',
      cyan: '\x1b[36m',
    }

    const total = expandedArgs.length
    let failed = 0
    const fileResults: {
      file: string
      passed: boolean
      failureOutput: string
    }[] = []

    // eslint-disable-next-line no-console -- intentional progress output
    console.log(`\n${c.bold}Found ${total} UI e2e test files${c.reset}`)
    // eslint-disable-next-line no-console -- intentional progress output
    console.log(`${c.dim}========================================${c.reset}\n`)

    for (let i = 0; i < expandedArgs.length; i++) {
      const testFile = expandedArgs[i]
      if (!testFile) {
        continue
      }

      const current = i + 1

      // eslint-disable-next-line no-console -- intentional progress output
      console.log(
        `${c.cyan}[${current}/${total}]${c.reset} Running: ${c.bold}${testFile}${c.reset}`,
      )
      // eslint-disable-next-line no-console -- intentional progress output
      console.log(`${c.dim}----------------------------------------${c.reset}`)

      const proc = Bun.spawn(['bun', 'test', '--timeout', '10000', testFile], {
        stdout: 'pipe',
        stderr: 'pipe',
        env: { ...process.env, FORCE_COLOR: '1' },
      })

      const stdoutChunks: string[] = []
      const stderrChunks: string[] = []

      const readStream = async (
        stream: ReadableStream<Uint8Array>,
        target: NodeJS.WriteStream,
        chunks: string[],
      ) => {
        const reader = stream.getReader()
        const decoder = new TextDecoder()
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- stream loop
        while (true) {
          const { done, value } = await reader.read()
          if (done) {
            break
          }
          const text = decoder.decode(value, { stream: true })
          chunks.push(text)
          target.write(text)
        }
      }

      await Promise.all([
        readStream(proc.stdout, process.stdout, stdoutChunks),
        readStream(proc.stderr, process.stderr, stderrChunks),
      ])

      const result = await proc.exited
      const output = stdoutChunks.join('') + stderrChunks.join('')

      if (result === 0) {
        // eslint-disable-next-line no-console -- intentional progress output
        console.log(`${c.green}${c.bold}✓ PASSED: ${testFile}${c.reset}\n`)
        fileResults.push({ file: testFile, passed: true, failureOutput: '' })
      } else {
        // eslint-disable-next-line no-console -- intentional progress output
        console.log(`${c.red}${c.bold}✗ FAILED: ${testFile}${c.reset}\n`)
        failed++
        fileResults.push({
          file: testFile,
          passed: false,
          failureOutput: output,
        })
      }
    }

    // eslint-disable-next-line no-console -- intentional summary output
    console.log(`${c.bold}========================================${c.reset}`)
    // eslint-disable-next-line no-console -- intentional summary output
    console.log(`${c.bold}Test Results:${c.reset}`)
    // eslint-disable-next-line no-console -- intentional summary output
    console.log(`  Total:  ${c.bold}${total}${c.reset}`)
    // eslint-disable-next-line no-console -- intentional summary output
    console.log(`  Passed: ${c.green}${c.bold}${total - failed}${c.reset}`)
    // eslint-disable-next-line no-console -- intentional summary output
    console.log(
      `  Failed: ${failed > 0 ? `${c.red}${c.bold}` : `${c.green}${c.bold}`}${failed}${c.reset}`,
    )

    if (failed > 0) {
      // eslint-disable-next-line no-console -- intentional summary output
      console.log(
        `\n${c.red}${c.bold}========================================${c.reset}`,
      )
      // eslint-disable-next-line no-console -- intentional summary output
      console.log(`${c.red}${c.bold}FAILURE DETAILS:${c.reset}`)
      // eslint-disable-next-line no-console -- intentional summary output
      console.log(
        `${c.red}${c.bold}========================================${c.reset}`,
      )

      for (const { file, passed, failureOutput } of fileResults) {
        if (passed) {
          continue
        }

        // eslint-disable-next-line no-console -- intentional summary output
        console.log(`\n${c.red}${c.bold}--- ${file} ---${c.reset}`)

        // Strip ANSI codes for pattern matching
        // eslint-disable-next-line no-control-regex -- stripping ANSI escape codes
        const ansiPattern = /\x1b\[[0-9;]*m/g
        const stripAnsi = (s: string) => s.replace(ansiPattern, '')

        // Bun test outputs errors *before* the ✗ line for each failed
        // test, so we accumulate error lines and flush them when we hit
        // the ✗ marker that they belong to.
        const lines = failureOutput.split('\n')
        const errorPattern =
          /^\s*(error|expect|assert|Error:|Expected|Received|AssertionError)/i

        let pendingErrors: string[] = []

        for (const line of lines) {
          const plain = stripAnsi(line)
          if (plain.includes('✗')) {
            // eslint-disable-next-line no-console -- intentional summary output
            console.log(`  ${line.trim()}`)
            pendingErrors.forEach((err, i) => {
              // eslint-disable-next-line no-console -- intentional summary output
              console.log(`${i === 0 ? '' : '  '}    ${err}`)
            })
            pendingErrors = []
          } else if (errorPattern.test(plain)) {
            pendingErrors.push(line.trim())
          }
        }
      }

      // eslint-disable-next-line no-console -- intentional summary output
      console.log(
        `\n${c.red}${c.bold}========================================${c.reset}`,
      )
      // eslint-disable-next-line no-console -- intentional summary output
      console.log(
        `${c.red}${c.bold}${failed} of ${total} test file(s) failed. See details above.${c.reset}`,
      )
      process.exit(1)
    }

    // eslint-disable-next-line no-console -- intentional summary output
    console.log(`\n${c.green}${c.bold}All tests passed!${c.reset}`)
    process.exit(0)
  }

  // For api mode, run all tests together
  const testResult = await Bun.spawn(
    ['bun', 'test', '--timeout', '10000', ...expandedArgs],
    {
      stdout: 'inherit',
      stderr: 'inherit',
    },
  ).exited

  process.exit(testResult)
}

await main()
