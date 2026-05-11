import Bun from 'bun'
import net from 'net'
import path from 'path'

const MODES = ['api', 'ui'] as const
type Mode = (typeof MODES)[number]

// Try to bind a port. Resolves to the port number if successful, null if
// EADDRINUSE / EACCES, rejects on any other error. There's an unavoidable
// TOCTOU between close() and the consumer binding the port, but for test
// orchestration on a single host it's the least-fragile option.
async function tryBindPort(port: number): Promise<number | null> {
  return new Promise((resolve, reject) => {
    const srv = net.createServer()
    srv.unref()
    srv.once('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE' || err.code === 'EACCES') {
        resolve(null)
        return
      }
      reject(err)
    })
    srv.listen(port, '127.0.0.1', () => {
      srv.close(() => resolve(port))
    })
  })
}

// Pick a free port within [start, end] (inclusive). Backend tests cap the
// range at 7000-9000; frontend has no such constraint but we pick from a
// disjoint range so the two never collide. `taken` excludes ports already
// handed out in this orchestrator run.
async function pickFreePortInRange(
  start: number,
  end: number,
  taken: Set<number>,
): Promise<number> {
  // Randomise the starting offset so two concurrent orchestrators don't
  // both walk from `start` and collide on the same port at the same instant.
  const span = end - start + 1
  const offset = Math.floor(Math.random() * span)
  for (let i = 0; i < span; i++) {
    const port = start + ((offset + i) % span)
    if (taken.has(port)) {
      continue
    }
    const bound = await tryBindPort(port)
    if (bound !== null) {
      taken.add(bound)
      return bound
    }
  }
  throw new Error(`No free port available in range ${start}-${end}`)
}

const BACKEND_PORT_RANGE: [number, number] = [7000, 9000]
const FRONTEND_PORT_RANGE: [number, number] = [9001, 10999]
const takenPorts = new Set<number>()

async function waitForPort(host: string, port: number, timeoutMs: number) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`http://${host}:${port}`, {
        signal: AbortSignal.timeout(500),
      })
      // Any TCP-level response (including 4xx) means the port is up
      void res.body?.cancel()
      return
    } catch {
      await Bun.sleep(100)
    }
  }
  throw new Error(`Timeout waiting for ${host}:${port}`)
}

interface PreviewHandle {
  proc: ReturnType<typeof Bun.spawn>
  drainOutput: () => string
}

async function killPreviewServer(handle: PreviewHandle | null): Promise<void> {
  if (!handle) {
    return
  }
  const { proc } = handle
  try {
    proc.kill()
  } catch {
    // already dead
  }
  const exited = await Promise.race([
    proc.exited.then(() => true),
    Bun.sleep(5000).then(() => false),
  ])
  if (!exited) {
    // SIGTERM didn't take — escalate so we don't carry over a still-bound
    // port into the next test file's --strictPort spawn.
    try {
      proc.kill('SIGKILL')
    } catch {
      // already dead
    }
    await proc.exited
  }
}

async function spawnPreviewServer(
  frontendPort: number,
  backendPort: number,
): Promise<PreviewHandle> {
  const uiDir = path.resolve(import.meta.dir, '../../ui')
  const proc = Bun.spawn({
    cmd: [
      'bunx',
      'vite',
      'preview',
      '--port',
      String(frontendPort),
      '--strictPort',
      '--host',
      '127.0.0.1',
    ],
    cwd: uiDir,
    stdout: 'pipe',
    stderr: 'pipe',
    env: {
      ...process.env,
      LOMBOK_BACKEND_HOST: `http://127.0.0.1:${backendPort}`,
    },
  })

  // Drain vite output into ring buffers so it doesn't backpressure-block the
  // process, but keep it around for failure diagnostics. Without this the
  // only signal on a failed start is "Timeout waiting for 127.0.0.1:<port>".
  const stdoutChunks: string[] = []
  const stderrChunks: string[] = []
  const MAX_CHUNKS = 200
  const collect = async (
    stream: ReadableStream<Uint8Array>,
    sink: string[],
  ) => {
    const reader = stream.getReader()
    const decoder = new TextDecoder()
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- stream loop
    while (true) {
      const { done, value } = await reader.read()
      if (done) {
        return
      }
      sink.push(decoder.decode(value, { stream: true }))
      if (sink.length > MAX_CHUNKS) {
        sink.splice(0, sink.length - MAX_CHUNKS)
      }
    }
  }
  void collect(proc.stdout, stdoutChunks)
  void collect(proc.stderr, stderrChunks)

  const drainOutput = () =>
    `--- vite stdout ---\n${stdoutChunks.join('')}\n--- vite stderr ---\n${stderrChunks.join('')}`

  try {
    await waitForPort('127.0.0.1', frontendPort, 30000)
  } catch (err) {
    // The orchestrator can't recover from a failed preview-server start —
    // kill the spawned proc so it doesn't leak listening on the port and
    // block the next test-file's spawn attempt.
    await killPreviewServer({ proc, drainOutput })
    const message = err instanceof Error ? err.message : String(err)
    throw new Error(`${message}\n${drainOutput()}`)
  }

  return { proc, drainOutput }
}

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

  const isApiTest = (filePath: string) => filePath.endsWith('.e2e-spec.ts')
  const isUiTest = (filePath: string) => filePath.endsWith('.ui-e2e-spec.ts')

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

      // Spawn the vite preview server in the orchestrator process — not the
      // bun-test subprocess — so bun-test's per-test "dangling subprocess"
      // cleanup can't SIGKILL it between tests within a suite (which is what
      // historically broke the file-upload suite, with every test after the
      // first upload failing on ERR_CONNECTION_REFUSED to the preview port).
      // The preview is reused across the single test file's run and torn
      // down before moving on to the next file. Ports are picked per file
      // from disjoint ranges so two parallel runs (or a dev process already
      // on a fixed port) can coexist without colliding. The backend range is
      // capped at 7000-9000 because buildTestModule enforces that range.
      const backendPort = await pickFreePortInRange(
        BACKEND_PORT_RANGE[0],
        BACKEND_PORT_RANGE[1],
        takenPorts,
      )
      const frontendPort = await pickFreePortInRange(
        FRONTEND_PORT_RANGE[0],
        FRONTEND_PORT_RANGE[1],
        takenPorts,
      )
      const previewHandle = await spawnPreviewServer(frontendPort, backendPort)

      const proc = Bun.spawn(['bun', 'test', '--timeout', '10000', testFile], {
        stdout: 'pipe',
        stderr: 'pipe',
        env: {
          ...process.env,
          FORCE_COLOR: '1',
          UI_E2E_FRONTEND_PORT: String(frontendPort),
          UI_E2E_BACKEND_PORT: String(backendPort),
        },
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
      await killPreviewServer(previewHandle)
      // Return ports to the pool now that both processes are gone.
      takenPorts.delete(backendPort)
      takenPorts.delete(frontendPort)
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
