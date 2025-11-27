import crypto from 'node:crypto'

const DEFAULT_WAIT_MS = 2000
const DEFAULT_PORT_INPUT = Number.parseInt(process.env.APP_PORT ?? '8080', 10)
const SERVER_PORT = Number.isNaN(DEFAULT_PORT_INPUT) ? 8080 : DEFAULT_PORT_INPUT

interface CliOptions {
  waitMs: number
}

interface JobRecord {
  id: string
  waitMs: number
  status: 'running' | 'completed'
  startedAt: string
  completedAt?: string
}

const parseCliArgs = (args: string[]): CliOptions => {
  const waitFlagIndex = args.findIndex((arg) => arg === '--wait-ms')
  let waitMs: number | undefined

  if (waitFlagIndex !== -1 && args[waitFlagIndex + 1]) {
    waitMs = Number.parseInt(args[waitFlagIndex + 1], 10)
  }

  // Support --wait-ms=VALUE style
  if (!waitMs) {
    const eqArg = args
      .filter((arg) => arg.startsWith('--wait-ms='))
      .map((arg) => arg.split('=')[1])
      .at(0)
    if (eqArg) {
      waitMs = Number.parseInt(eqArg, 10)
    }
  }

  if (Number.isNaN(waitMs) || waitMs === undefined) {
    waitMs = DEFAULT_WAIT_MS
  }

  return { waitMs }
}

const cliOptions = parseCliArgs(process.argv.slice(2))
const jobs = new Map<string, JobRecord>()

const jsonResponse = (body: unknown, init?: ResponseInit): Response => {
  return new Response(JSON.stringify(body, null, 2), {
    headers: {
      'content-type': 'application/json',
    },
    ...init,
  })
}

const scheduleJob = (waitOverride?: number): JobRecord => {
  const waitMs = waitOverride ?? cliOptions.waitMs
  const id = crypto.randomUUID()
  const job: JobRecord = {
    id,
    waitMs,
    status: 'running',
    startedAt: new Date().toISOString(),
  }

  jobs.set(id, job)

  setTimeout(() => {
    const existing = jobs.get(id)
    if (!existing) {
      return
    }
    jobs.set(id, {
      ...existing,
      status: 'completed',
      completedAt: new Date().toISOString(),
    })
  }, waitMs)

  return job
}

const getJobsList = (): JobRecord[] => {
  return Array.from(jobs.values()).sort((a, b) =>
    a.startedAt.localeCompare(b.startedAt),
  )
}

const server = Bun.serve({
  port: SERVER_PORT,
  fetch: async (request) => {
    const url = new URL(request.url)
    const pathname = url.pathname

    if (request.method === 'GET' && pathname === '/health') {
      return jsonResponse({
        status: 'ok',
        waitMs: cliOptions.waitMs,
        jobs: {
          total: jobs.size,
          completed: Array.from(jobs.values()).filter(
            (job) => job.status === 'completed',
          ).length,
        },
        uptimeSeconds: Math.round(process.uptime()),
      })
    }

    if (request.method === 'GET' && pathname === '/config') {
      return jsonResponse({
        waitMs: cliOptions.waitMs,
        port: SERVER_PORT,
        args: process.argv.slice(2),
      })
    }

    if (request.method === 'POST' && pathname === '/jobs') {
      let body: { waitMs?: number } | undefined
      try {
        body = await request.json()
      } catch {
        body = undefined
      }

      if (body?.waitMs !== undefined && Number.isNaN(body.waitMs)) {
        return jsonResponse(
          { error: 'waitMs must be a number when provided' },
          { status: 400 },
        )
      }

      const job = scheduleJob(body?.waitMs)

      return jsonResponse({
        message: 'job accepted',
        job,
      })
    }

    if (request.method === 'GET' && pathname === '/jobs') {
      return jsonResponse({ jobs: getJobsList() })
    }

    if (request.method === 'GET' && pathname.startsWith('/jobs/')) {
      const id = pathname.split('/')[2]
      if (!id) {
        return jsonResponse({ error: 'Job id required' }, { status: 400 })
      }
      const job = jobs.get(id)
      if (!job) {
        return jsonResponse({ error: 'Job not found' }, { status: 404 })
      }
      return jsonResponse({ job })
    }

    if (request.method === 'DELETE' && pathname === '/jobs') {
      jobs.clear()
      return jsonResponse({ message: 'All jobs cleared' })
    }

    return jsonResponse({ error: 'Not found' }, { status: 404 })
  },
})

// eslint-disable-next-line no-console
console.log(
  `Mock runner listening on port ${server.port} (default wait ${cliOptions.waitMs}ms)`,
)
