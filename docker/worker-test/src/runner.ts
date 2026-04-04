import { randomUUID } from 'crypto'
import { execSync } from 'child_process'
import { resolve, dirname, join } from 'path'
import { copyFileSync, mkdirSync, existsSync, rmSync, readFileSync } from 'fs'
import type { TestConfig } from './config'
import { DockerClient } from './docker'
import { buildImageViaSSH } from './ssh-build'
import { MockPlatformServer } from './mock-platform'
import { FileServer } from './file-server'
import { JobDispatcher } from './job-dispatcher'
import { validateJobResult } from './validation'

export interface TestResult {
  jobId: string
  jobName?: string
  success: boolean
  error?: string
  validationErrors?: string[]
  logs?: {
    agent?: string
    worker?: string
    job?: string
  }
}

export interface TestRunResult {
  success: boolean
  results: TestResult[]
  errors: string[]
}

export class TestRunner {
  private docker: DockerClient | null = null
  private containerId: string | null = null
  private mockPlatform: MockPlatformServer | null = null
  private fileServer: FileServer | null = null

  /**
   * Run tests based on configuration
   */
  async run(
    config: TestConfig,
    options: {
      buildOnly?: boolean
      configPath?: string
      noCleanup?: boolean
      verbose?: boolean
    } = {},
  ): Promise<TestRunResult> {
    const results: TestResult[] = []
    const errors: string[] = []

    try {
      // 1. Build docker image
      console.log('Building Docker image...')
      await this.buildImage(config, options.configPath)

      if (options.buildOnly) {
        console.log('Build-only mode: skipping test execution')
        return { success: true, results: [], errors: [] }
      }

      // 2. Push to registry if configured
      if (config.build?.registry?.push) {
        console.log('Pushing image to registry...')
        await this.pushImage(config)
      }

      // 3. Start mock servers
      if (config.mockServer) {
        console.log('Starting mock servers...')
        await this.startMockServers(config, options.configPath, options.verbose)
      }

      // 4. Create and start container
      console.log('Creating container...')
      await this.createContainer(config)

      // 5. Run jobs
      console.log(`Running ${config.jobs.length} job(s)...`)
      for (const jobConfig of config.jobs) {
        if (!jobConfig.payload.job_id) {
          jobConfig.payload.job_id = randomUUID()
        }
        try {
          const result = await this.runJob(config, jobConfig, options.verbose)
          results.push(result)
        } catch (error) {
          const errorMsg =
            error instanceof Error ? error.message : String(error)
          errors.push(
            `Job ${jobConfig.name ?? 'unknown'} (${
              jobConfig.payload.job_id
            }): ${errorMsg}`,
          )
          results.push({
            jobId: jobConfig.payload.job_id,
            jobName: jobConfig.name,
            success: false,
            error: errorMsg,
          })
        }
      }

      // 6. Cleanup
      if (!options.noCleanup) {
        console.log('Cleaning up...')
        await this.cleanup()
      }

      const success = results.every((r) => r.success) && errors.length === 0

      return {
        success,
        results,
        errors,
      }
    } catch (error) {
      // Ensure cleanup on error
      if (!options.noCleanup) {
        await this.cleanup().catch((cleanupError) => {
          console.error('Cleanup error:', cleanupError)
        })
      }

      const errorMsg = error instanceof Error ? error.message : String(error)
      errors.push(errorMsg)
      return {
        success: false,
        results,
        errors,
      }
    }
  }

  /**
   * Build Docker image
   */
  private async buildImage(
    config: TestConfig,
    configPath?: string,
  ): Promise<void> {
    const configDir = dirname(resolve(configPath ?? config.dockerfile))
    const buildContext = configPath
      ? dirname(resolve(...[configPath, config.buildContext ?? '.']))
      : configDir

    // Run prebuild script if configured
    if (config.prebuild) {
      this.runPrebuild(config.prebuild, configDir)
    }

    if (config.build?.ssh) {
      // Remote build via SSH
      await buildImageViaSSH({
        ssh: config.build.ssh,
        dockerfile: config.dockerfile,
        buildContext,
        imageName: config.imageName,
        buildArgs: {
          ...config.buildArgs,
          AGENT_VARIANT: config.agentBinaryVariant || 'linux-amd64',
        },
        noCache: config.build.noCache,
      })
    } else {
      // Local build
      if (!this.docker) {
        this.docker = new DockerClient(config.container.dockerHost)
      }

      await this.docker.buildImage({
        dockerfile: config.dockerfile,
        buildContext,
        imageName: config.imageName,
        buildArgs: {
          ...config.buildArgs,
          AGENT_VARIANT: config.agentBinaryVariant || 'linux-amd64',
        },
        tag: config.imageName,
        noCache: config.build?.noCache,
      })
    }
  }

  /**
   * Run a prebuild script before docker build.
   * The script is resolved relative to the config file directory
   * and executed with the config directory as cwd.
   */
  private runPrebuild(scriptPath: string, configDir: string): void {
    const resolved = resolve(configDir, scriptPath)
    if (!existsSync(resolved)) {
      throw new Error(`Prebuild script not found: ${resolved}`)
    }
    console.log(`Running prebuild script: ${resolved}`)
    execSync(`bash "${resolved}"`, {
      cwd: configDir,
      stdio: 'inherit',
      env: process.env,
    })
  }

  /**
   * Push image to registry
   */
  private async pushImage(config: TestConfig): Promise<void> {
    if (!this.docker) {
      this.docker = new DockerClient(config.container.dockerHost)
    }

    const registry = config.build?.registry
    if (!registry) {
      throw new Error('Registry configuration not found')
    }

    await this.docker.pushImage({
      imageName: config.imageName,
      registry: {
        url: registry.url,
        username: registry.username,
        password: registry.password,
      },
    })
  }

  /**
   * Start mock servers
   */
  private async startMockServers(
    config: TestConfig,
    configPath?: string,
    verbose = false,
  ): Promise<void> {
    const mockServerConfig = config.mockServer
    if (!mockServerConfig) {
      console.warn(
        'Mock server configuration not found, skipping mock server start',
      )
      return
    }

    if (!configPath) {
      throw new Error(
        'Config path required for mock server setup (needed for file server root)',
      )
    }

    const configDir = dirname(resolve(configPath))

    // Determine file server root: use configured path or default to <config_dir>/mocks/file-server-content
    let fileServerRoot: string
    if (mockServerConfig.fileServerRoot) {
      // Resolve relative to config file directory if not absolute
      fileServerRoot = mockServerConfig.fileServerRoot.startsWith('/')
        ? mockServerConfig.fileServerRoot
        : resolve(configDir, mockServerConfig.fileServerRoot)
    } else {
      // Default to <config_dir>/mocks/file-server-content
      fileServerRoot = join(configDir, 'mocks', 'file-server-content')
    }

    // Ensure file server root exists
    if (!existsSync(fileServerRoot)) {
      mkdirSync(fileServerRoot, { recursive: true })
    }

    this.mockPlatform = new MockPlatformServer({
      platformPort: mockServerConfig.platformPort,
      fileServerPort: mockServerConfig.fileServerPort,
      verbose,
    })

    this.fileServer = new FileServer({
      port: mockServerConfig.fileServerPort,
      rootDir: fileServerRoot,
      verbose,
    })

    await Promise.all([this.mockPlatform.start(), this.fileServer.start()])
  }

  /**
   * Create and start container
   */
  private async createContainer(config: TestConfig): Promise<void> {
    if (!this.docker) {
      this.docker = new DockerClient(config.container.dockerHost)
    }

    const containerName =
      config.container.name || `lombok-worker-test-${randomUUID().slice(0, 8)}`

    const containerInfo = await this.docker.createContainer(
      config.imageName,
      config.container,
      {
        'lombok.worker-test': 'true',
        'lombok.worker-test.name': containerName,
      },
    )

    this.containerId = containerInfo.id
    console.log(`Container created: ${containerInfo.id} (${containerName})`)

    if (config.liveLogs && this.docker && this.containerId) {
      console.log('Tailing container logs...')
      this.docker.streamContainerLogs(this.containerId, { tail: 100 })
    }
  }

  /**
   * Run a single job
   */
  private async runJob(
    config: TestConfig,
    jobConfig: TestConfig['jobs'][0],
    verbose = false,
  ): Promise<TestResult> {
    let jobId = jobConfig.payload.job_id
    if (!this.docker || !this.containerId) {
      throw new Error('Container not created')
    }

    const dispatcher = new JobDispatcher(this.docker, this.containerId)

    // Set platform URL if mock server is running
    if (this.mockPlatform && !jobConfig.payload.platform_url) {
      jobConfig.payload.platform_url = this.mockPlatform.getBaseUrl()
    }

    if (verbose) {
      console.log(
        `\nRunning job: ${jobConfig.name ?? 'unknown'} (${
          jobConfig.payload.job_id
        })`,
      )
      console.log(`  Job class: ${jobConfig.payload.job_class}`)
      console.log(`  Interface: ${jobConfig.payload.interface.kind}`)
    }

    const submissionTimeout = jobConfig.submissionTimeout ?? 10000 // 10 seconds default
    const completionTimeout = jobConfig.completionTimeout ?? 300000 // 5 minutes default

    try {
      // Execute job
      const executionResult = await dispatcher.executeJob(jobConfig.payload, {
        submissionTimeout,
        completionTimeout,
        pollInterval: 2000, // 2 seconds
        collectLogs: true,
      })

      // Validate result
      let validationResult
      if (jobConfig.validate) {
        if (!executionResult.result) {
          throw new Error('Job completed but no result available')
        }

        validationResult = await validateJobResult(
          executionResult.result,
          jobConfig.validate,
        )
      } else {
        validationResult = { valid: true, errors: [] }
      }

      const jobSucceeded =
        executionResult.state.status === 'success' &&
        (!executionResult.result || executionResult.result.success !== false) &&
        !executionResult.result?.error

      const success = jobSucceeded && validationResult.valid

      if (verbose || !success) {
        // Always show logs
        if (executionResult.logs) {
          ;(!success ? console.error : console.log)(
            `\n--- Agent Log ${!success ? '(failure) ' : ''}---`,
          )
          try {
            const agentLogs = await dispatcher.getAgentLogs(200)
            if (!agentLogs) {
              console.log('(no logs)')
            } else {
              for (const line of agentLogs.split('\n')) {
                ;(line.includes('|ERROR|') ? console.error : console.log)(line)
              }
            }
          } catch (logError) {
            console.error(
              'Failed to fetch agent log on failure:',
              logError instanceof Error ? logError.message : String(logError),
            )
          }

          ;(!success ? console.error : console.log)(
            `\n--- Job Log ${!success ? '(failure) ' : ''}---`,
          )
          try {
            const jobLog = await dispatcher.getJobLogs(
              jobConfig.payload.job_id ?? '',
            )
            if (!jobLog) {
              console.log('(no job log)')
            } else {
              for (const line of jobLog.split('\n')) {
                ;(line.includes('|ERROR|') ? console.error : console.log)(line)
              }
            }
          } catch (logError) {
            console.error(
              'Failed to fetch job log on error:',
              logError instanceof Error ? logError.message : String(logError),
            )
          }
        }

        if (!validationResult.valid) {
          console.error(`\nValidation failed:`)
          validationResult.errors.forEach((err) => {
            console.error(`  - ${err}`)
          })
        }

        // Print verbose job information
        if (verbose || !success) {
          await this.printVerboseJobInfo(
            dispatcher,
            executionResult.jobId,
            !success,
          )
        }
      }

      return {
        jobId: executionResult.jobId,
        jobName: jobConfig.name,
        success,
        error:
          executionResult.state.status === 'failed'
            ? executionResult.result?.error?.message
            : undefined,
        validationErrors: validationResult.valid
          ? undefined
          : validationResult.errors,
        logs: executionResult.logs,
      }
    } catch (error) {
      const isTimeout =
        error instanceof Error &&
        (error as { code?: string }).code === 'EXEC_TIMEOUT'
      const errorMsg = error instanceof Error ? error.message : String(error)

      console.error(
        `\n--- ${
          isTimeout ? 'Job Submission Timeout' : 'Test Runner Error'
        } ---`,
      )
      console.error(errorMsg)
      if (error instanceof Error && error.stack && !isTimeout) {
        console.error(error.stack)
      }

      // Extract container logs to help diagnose the failure
      if (this.docker && this.containerId) {
        let containerLogs = ''
        try {
          containerLogs = await this.docker.getContainerLogs(this.containerId, {
            tail: 100,
          })
          if (containerLogs.trim()) {
            console.error('\n--- Container Logs (last 100 lines) ---')
            for (const line of containerLogs.split('\n')) {
              const isError = /error|fatal|panic|exception|traceback/i.test(
                line,
              )
              ;(isError ? console.error : console.log)(line)
            }
            console.error('--- End Container Logs ---')
          }
        } catch (logErr) {
          console.error(
            'Failed to fetch container logs:',
            logErr instanceof Error ? logErr.message : String(logErr),
          )
        }

        // If "Poll error" detected, dump raw state files via exec (bypassing the agent)
        // await this.dumpJobStateFiles(jobConfig.payload.job_id ?? '')
        if (jobConfig.payload.job_id) {
          await this.printVerboseJobInfo(
            dispatcher,
            jobConfig.payload.job_id,
            false,
          )
        }
      }

      throw error
    }
  }

  /**
   * Print verbose job information
   */
  private async printVerboseJobInfo(
    dispatcher: JobDispatcher,
    jobId: string,
    failure: boolean = false,
  ): Promise<void> {
    ;(failure ? console.error : console.log)(
      `\n=== Verbose Job Information ${failure ? '(failure) ' : ''}===`,
    )

    // Output directory listing
    try {
      ;(failure ? console.error : console.log)(
        `\n--- Output Directory Contents (${jobId}) ---`,
      )
      const outputDir = await dispatcher.listJobOutputDirectory(jobId)
      console.log(outputDir)
    } catch (error) {
      console.log(
        `Failed to list output directory: ${
          error instanceof Error ? error.message : String(error)
        }`,
      )
    }

    // Manifest file
    try {
      ;(failure ? console.error : console.log)(
        `\n--- Manifest File (${jobId}) ---`,
      )
      const manifest = await dispatcher.readManifestFile(jobId)
      if (manifest) {
        try {
          const manifestJson = JSON.parse(manifest)
          console.log(JSON.stringify(manifestJson, null, 2))
        } catch {
          console.log(manifest)
        }
      } else {
        console.log('(manifest file not found)')
      }
    } catch (error) {
      console.log(
        `Failed to read manifest: ${
          error instanceof Error ? error.message : String(error)
        }`,
      )
    }

    // Job result file
    try {
      ;(failure ? console.error : console.log)(
        `\n--- Job Result File (${jobId}) ---`,
      )
      const result = await dispatcher.readJobResultFile(jobId)
      if (result) {
        try {
          const resultJson = JSON.parse(result)
          console.log(JSON.stringify(resultJson, null, 2))
        } catch {
          console.log(result)
        }
      } else {
        console.log('(result file not found)')
      }
    } catch (error) {
      console.log(
        `Failed to read result file: ${
          error instanceof Error ? error.message : String(error)
        }`,
      )
    }

    // Job state file
    try {
      ;(failure ? console.error : console.log)(
        `\n--- Job State File (${jobId}) ---`,
      )
      const state = await dispatcher.readJobStateFile(jobId)
      if (state) {
        try {
          const stateJson = JSON.parse(state)
          console.log(JSON.stringify(stateJson, null, 2))
        } catch {
          console.log(state)
        }
      } else {
        console.log('(state file not found)')
      }
    } catch (error) {
      console.log(
        `Failed to read state file: ${
          error instanceof Error ? error.message : String(error)
        }`,
      )
    }

    ;(failure ? console.error : console.log)(
      '\n=== End Verbose Job Information ===\n',
    )
  }

  /**
   * Cleanup resources
   */
  private async cleanup(): Promise<void> {
    const cleanupTasks: Promise<void>[] = []

    if (this.containerId && this.docker) {
      cleanupTasks.push(
        this.docker
          .removeContainer(this.containerId, true)
          .then(() => {
            console.log('Container removed')
          })
          .catch((err) => {
            console.error('Failed to remove container:', err)
          }),
      )
    }

    if (this.mockPlatform) {
      cleanupTasks.push(this.mockPlatform.stop())
    }

    if (this.fileServer) {
      cleanupTasks.push(this.fileServer.stop())
    }

    await Promise.all(cleanupTasks)
  }
}
