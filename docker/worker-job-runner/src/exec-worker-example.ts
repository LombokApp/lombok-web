#!/usr/bin/env bun

import fs from 'node:fs'

/**
 * Minimal Exec Worker Example (exec_per_job interface)
 *
 * This worker demonstrates the logging patterns required for exec workers:
 *
 * 1. Job-specific structured logs:
 *    - Format: JOB_ID_<job_id>|LEVEL|["message",{optional_data}]\n
 *    - Output to stdout (INFO, DEBUG, WARN) or stderr (ERROR, FATAL)
 *    - These logs are captured by the agent and written to per-job log files
 *    - Also appear in unified log with format: timestamp|JOB_ID_<job_id>|LEVEL|["message",{data}]
 *
 * 2. Result output:
 *    - MUST write valid JSON to the file specified by the JOB_RESULT_FILE environment variable
 *    - This JSON is read by the agent and included in the job result
 *    - All stdout/stderr output is treated as logs
 *
 * Usage:
 *   The agent spawns this worker with job_input as base64-encoded final argument:
 *   bun exec-worker-example.ts <base64_job_input>
 */

// Get result file path from environment variable
const resultFilePath = process.env.JOB_RESULT_FILE
if (!resultFilePath) {
  console.error('ERROR: JOB_RESULT_FILE environment variable not set')
  process.exit(1)
}

// Get job_id from environment variable (set by agent) or parse from input
let job_id: string | undefined = process.env.JOB_ID

// Extract job input from base64-encoded argument
// The agent passes job_input as base64-encoded final argument
const args = process.argv.slice(2)
if (args.length === 0) {
  console.error('ERROR: Missing base64-encoded job_input argument')
  process.exit(1)
}

// Decode base64 job input
let jobInput: { job_id: string; job_class: string; job_input: unknown }
let job_input: unknown

try {
  const base64Input = args[0]
  const jsonString = Buffer.from(base64Input, 'base64').toString('utf-8')
  jobInput = JSON.parse(jsonString) as {
    job_id: string
    job_class: string
    job_input: unknown
  }
  // Use job_id from environment if available, otherwise from parsed input
  if (!job_id) {
    job_id = jobInput.job_id
  }
  job_input = jobInput.job_input
} catch (error) {
  console.error(
    `ERROR: Failed to decode job input: ${
      error instanceof Error ? error.message : String(error)
    }`,
  )
  process.exit(1)
}

// Ensure we have a job_id
if (!job_id) {
  console.error('ERROR: job_id not available from environment or input')
  process.exit(1)
}

// Helper to output structured job logs
// Format: JOB_ID_<job_id>|LEVEL|["message",{optional_data}]\n
function logJob(
  jobId: string,
  level: 'INFO' | 'DEBUG' | 'WARN' | 'ERROR' | 'FATAL',
  message: string,
  data?: unknown,
): void {
  const logArray = data
    ? JSON.stringify([message, data])
    : JSON.stringify([message])
  const logLine = `${level}|${logArray}\n`

  // ERROR and FATAL go to stderr, others to stdout
  if (level === 'ERROR' || level === 'FATAL') {
    process.stderr.write(logLine)
  } else {
    process.stdout.write(logLine)
  }
}

// Main job execution
async function main() {
  // Log job start (appears in job log and unified log as JOB_ID_<job_id>)
  logJob(job_id, 'INFO', 'Job started', { job_class: jobInput.job_class })

  try {
    // Simulate work with progress logs
    logJob(job_id, 'INFO', 'Processing job input', { input: job_input })

    // Simulate some work
    await new Promise((resolve) => setTimeout(resolve, 100))

    // Process the job input (example: echo it back)
    const result = {
      processed: true,
      input: job_input,
      timestamp: new Date().toISOString(),
    }

    logJob(job_id, 'INFO', 'Job completed successfully', { result })

    // CRITICAL: Write result as JSON to the file specified by JOB_RESULT_FILE
    // This is what the agent reads as the job result
    fs.writeFileSync(resultFilePath, JSON.stringify(result))
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    logJob(job_id, 'ERROR', 'Job failed', { error: message })

    // Even on error, write a result JSON (agent will mark job as failed based on exit code)
    const errorResult = {
      success: false,
      error: message,
    }
    fs.writeFileSync(resultFilePath, JSON.stringify(errorResult))
    process.exit(1)
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error)
  // Only log if job_id was successfully parsed
  if (job_id) {
    logJob(job_id, 'FATAL', 'Fatal error', { error: message })
  } else {
    console.error(`FATAL: ${message}`)
  }
  process.exit(1)
})
