interface JobState {
  jobId: string
  jobClass: string
  status: 'pending' | 'running' | 'success' | 'failed'
  result?: unknown
  error?: { code: string; message: string }
}

const DEFAULT_PORT = Number.parseInt(process.env.APP_PORT ?? '8080', 10)
const SERVER_PORT = Number.isNaN(DEFAULT_PORT) ? 8080 : DEFAULT_PORT
const EXIT_CODE = Number.parseInt(process.env.EXIT_CODE ?? '0', 10) || 0
const EXIT_AFTER_JOBS = Number.parseInt(process.env.EXIT_AFTER_JOBS ?? '0', 10) || 0
const EXIT_DELAY_MS = Number.parseInt(process.env.EXIT_DELAY_MS ?? '1000', 10) || 0
const JOB_DELAY_MS = Number.parseInt(process.env.JOB_DELAY_MS ?? '50', 10) || 0

const jobStates = new Map<string, JobState>()
let completedJobs = 0
let exitScheduled = false

const jsonResponse = (body: unknown, init?: ResponseInit): Response => {
  return new Response(JSON.stringify(body), {
    headers: { 'content-type': 'application/json' },
    ...init,
  })
}

const scheduleExit = () => {
  if (EXIT_AFTER_JOBS <= 0 || exitScheduled) {
    return
  }
  if (completedJobs < EXIT_AFTER_JOBS) {
    return
  }

  exitScheduled = true
  console.log(`[exit-worker] exiting with code ${EXIT_CODE}`)
  setTimeout(() => {
    process.exit(EXIT_CODE)
  }, EXIT_DELAY_MS)
}

console.log(`[exit-worker] starting on port ${SERVER_PORT}`)

const server = Bun.serve({
  port: SERVER_PORT,
  fetch: async (request) => {
    const url = new URL(request.url)
    const pathname = url.pathname

    if (request.method === 'GET' && pathname === '/health/ready') {
      return jsonResponse({ ready: true }, { status: 200 })
    }

    if (request.method === 'POST' && pathname === '/job') {
      let body: { job_id?: string; job_class?: string } | undefined
      try {
        body = (await request.json()) as {
          job_id?: string
          job_class?: string
        }
      } catch {
        return jsonResponse(
          {
            accepted: false,
            error: { code: 'INVALID_JSON', message: 'Invalid JSON body' },
          },
          { status: 400 },
        )
      }

      if (!body?.job_id) {
        return jsonResponse(
          {
            accepted: false,
            error: { code: 'MISSING_JOB_ID', message: 'job_id is required' },
          },
          { status: 400 },
        )
      }

      const jobId = body.job_id
      const jobClass = body.job_class ?? 'unknown'

      const jobState: JobState = {
        jobId,
        jobClass,
        status: 'running',
      }
      jobStates.set(jobId, jobState)
      console.log(`[exit-worker] accepted job ${jobId}`)

      setTimeout(() => {
        jobState.status = 'success'
        jobState.result = { ok: true, job_id: jobId }
        jobStates.set(jobId, jobState)
        completedJobs += 1
        console.log(`[exit-worker] completed job ${jobId}`)
        scheduleExit()
      }, JOB_DELAY_MS)

      return jsonResponse({ accepted: true, job_id: jobId })
    }

    if (request.method === 'GET' && pathname.startsWith('/job/')) {
      const jobId = pathname.slice(5)
      const jobState = jobStates.get(jobId)
      if (!jobState) {
        return jsonResponse(
          { error: { code: 'JOB_NOT_FOUND', message: 'Job not found' } },
          { status: 404 },
        )
      }

      const response: Record<string, unknown> = {
        job_id: jobState.jobId,
        job_class: jobState.jobClass,
        status: jobState.status,
      }

      if (jobState.status === 'success' && jobState.result !== undefined) {
        response.result = jobState.result
      }
      if (jobState.status === 'failed' && jobState.error) {
        response.error = jobState.error
      }

      return jsonResponse(response)
    }

    return new Response('not found', { status: 404 })
  },
})

console.log(`[exit-worker] listening on port ${server.port}`)
