import { randomUUID } from 'crypto'
import type { DockerClient, DockerExecResult } from './docker'
import type { JobPayload } from './config'

export interface JobState {
  job_id: string
  job_class: string
  status: 'pending' | 'running' | 'success' | 'failed'
  started_at?: string
  completed_at?: string
  worker_kind: string
  worker_state_pid?: number
  error?: string
}

export interface JobResult {
  success: boolean
  job_id: string
  result?: unknown
  error?: {
    code: string
    message: string
  }
  timing?: Record<string, number>
}

export interface JobExecutionResult {
  jobId: string
  state: JobState
  result?: JobResult
  logs?: {
    agent?: string
    worker?: string
    job?: string
  }
}

export class JobDispatcher {
  constructor(private docker: DockerClient, private containerId: string) {}

  /**
   * Submit a job to the worker agent
   */
  async submitJob(payload: JobPayload): Promise<string> {
    // Ensure job_id is set
    if (!payload.job_id) {
      payload.job_id = randomUUID()
    }

    // Ensure wait_for_completion is set
    if (payload.wait_for_completion === undefined) {
      payload.wait_for_completion = true
    }

    // Encode payload as base64
    const payloadJson = JSON.stringify(payload)
    const payloadBase64 = Buffer.from(payloadJson).toString('base64')

    // Execute agent command
    const command = [
      'lombok-worker-agent',
      'run-job',
      `--payload-base64=${payloadBase64}`,
    ]

    const execResult = await this.docker.execInContainer(
      this.containerId,
      command,
    )

    const lines = execResult.stdout.trim().split('\n').filter(Boolean)
    if (lines.length === 0) {
      throw new Error('Empty stdout from agent')
    }

    return payload.job_id ?? ''
  }

  /**
   * Get job state
   */
  async getJobState(jobId: string): Promise<JobState> {
    const command = ['lombok-worker-agent', 'job-state', '--job-id', jobId]

    const execResult = await this.docker.execInContainer(
      this.containerId,
      command,
    )

    if (execResult.exitCode !== 0) {
      throw new Error(
        `Failed to get job state: ${execResult.stderr || execResult.stdout}`,
      )
    }

    if (!execResult.stdout.trim()) {
      throw new Error(`Job state not found for job ${jobId}`)
    }

    try {
      return JSON.parse(execResult.stdout.trim()) as JobState
    } catch (err) {
      throw new Error(
        `Failed to parse job state: ${
          err instanceof Error ? err.message : String(err)
        }`,
      )
    }
  }

  /**
   * Get job result
   */
  async getJobResult(jobId: string): Promise<JobResult> {
    const command = ['lombok-worker-agent', 'job-result', '--job-id', jobId]

    const execResult = await this.docker.execInContainer(
      this.containerId,
      command,
    )

    if (execResult.exitCode !== 0) {
      throw new Error(
        `Failed to get job result: ${execResult.stderr || execResult.stdout}`,
      )
    }

    if (!execResult.stdout.trim()) {
      return {
        success: false,
        job_id: jobId,
        error: {
          code: 'JOB_RESULT_NOT_FOUND',
          message: 'Job result not found',
        },
      }
    }

    try {
      const result = JSON.parse(execResult.stdout.trim()) as JobResult & {
        job_id?: string
      }
      // Normalize job_id field
      if (result.job_id && !result.job_id) {
        result.job_id = result.job_id
      }
      return result
    } catch (err) {
      throw new Error(
        `Failed to parse job result: ${
          err instanceof Error ? err.message : String(err)
        }`,
      )
    }
  }

  /**
   * Get job logs
   */
  async getJobLogs(jobId: string, tail?: number): Promise<string> {
    const command = ['lombok-worker-agent', 'job-log', '--job-id', jobId]
    if (tail) {
      command.push('--tail', tail.toString())
    }

    const execResult = await this.docker.execInContainer(
      this.containerId,
      command,
    )

    if (execResult.exitCode !== 0) {
      throw new Error(
        `Failed to get job logs: ${execResult.stderr || execResult.stdout}`,
      )
    }

    return execResult.stdout
  }

  /**
   * Get agent logs
   */
  async getAgentLogs(tail?: number): Promise<string> {
    const command = ['lombok-worker-agent', 'agent-log']
    if (tail) {
      command.push('--tail', tail.toString())
    }

    const execResult = await this.docker.execInContainer(
      this.containerId,
      command,
    )

    if (execResult.exitCode !== 0) {
      throw new Error(
        `Failed to get agent logs: ${execResult.stderr || execResult.stdout}`,
      )
    }

    return execResult.stdout
  }

  /**
   * List files in job output directory
   */
  async listJobOutputDirectory(jobId: string): Promise<string> {
    const outputDir = `/var/lib/lombok-worker-agent/jobs/${jobId}/output`
    const command = [
      'sh',
      '-c',
      `ls -lah "${outputDir}" 2>/dev/null || echo "Directory not found or empty"`,
    ]

    const execResult = await this.docker.execInContainer(
      this.containerId,
      command,
    )

    return execResult.stdout || execResult.stderr || 'No output'
  }

  /**
   * Read manifest file contents
   */
  async readManifestFile(jobId: string): Promise<string | null> {
    const manifestPath = `/var/lib/lombok-worker-agent/jobs/${jobId}/output/__manifest__.json`
    const command = ['cat', manifestPath]

    const execResult = await this.docker.execInContainer(
      this.containerId,
      command,
    )

    if (execResult.exitCode !== 0) {
      return null
    }

    return execResult.stdout || null
  }

  /**
   * Read job result file contents
   */
  async readJobResultFile(jobId: string): Promise<string | null> {
    const resultPath = `/var/lib/lombok-worker-agent/jobs/${jobId}.result.json`
    const command = ['cat', resultPath]

    const execResult = await this.docker.execInContainer(
      this.containerId,
      command,
    )

    if (execResult.exitCode !== 0) {
      return null
    }

    return execResult.stdout || null
  }

  /**
   * Read job state file contents
   */
  async readJobStateFile(jobId: string): Promise<string | null> {
    const statePath = `/var/lib/lombok-worker-agent/jobs/${jobId}.json`
    const command = ['cat', statePath]

    const execResult = await this.docker.execInContainer(
      this.containerId,
      command,
    )

    if (execResult.exitCode !== 0) {
      return null
    }

    return execResult.stdout || null
  }

  /**
   * Wait for job completion
   */
  async waitForCompletion(
    jobId: string,
    options: {
      timeout?: number // milliseconds
      pollInterval?: number // milliseconds
    } = {},
  ): Promise<JobState> {
    const timeout = options.timeout || 300000 // 5 minutes default
    const pollInterval = options.pollInterval || 2000 // 2 seconds default
    const startTime = Date.now()

    while (true) {
      const elapsed = Date.now() - startTime
      if (elapsed > timeout) {
        throw new Error(
          `Job ${jobId} did not complete within ${timeout}ms (${
            timeout / 1000
          }s)`,
        )
      }

      const state = await this.getJobState(jobId ?? '')

      if (state.status === 'success' || state.status === 'failed') {
        return state
      }

      if (state.status === 'pending' || state.status === 'running') {
        await new Promise((resolve) => setTimeout(resolve, pollInterval))
        continue
      }

      throw new Error(`Unknown job status: ${state.status}`)
    }
  }

  /**
   * Execute a job and wait for completion
   */
  async executeJob(
    payload: JobPayload,
    options: {
      timeout?: number
      pollInterval?: number
      collectLogs?: boolean
    } = {},
  ): Promise<JobExecutionResult> {
    const jobId = await this.submitJob(payload)
    const state = await this.waitForCompletion(jobId, {
      timeout: options.timeout,
      pollInterval: options.pollInterval,
    })

    let result: JobResult | undefined
    let logs: JobExecutionResult['logs'] | undefined

    if (state.status === 'success' || state.status === 'failed') {
      result = await this.getJobResult(payload.job_id ?? '')
    }

    if (options.collectLogs) {
      try {
        logs = {
          agent: await this.getAgentLogs(200),
          job: await this.getJobLogs(jobId, 200),
        }
      } catch (err) {
        console.warn(
          `Failed to collect logs: ${
            err instanceof Error ? err.message : String(err)
          }`,
        )
      }
    }

    return {
      jobId,
      state,
      result,
      logs,
    }
  }
}
