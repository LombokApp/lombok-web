import { Command } from 'commander'
import { loadConfig, mergeConfigFlags } from './config'
import { TestRunner } from './runner'

export function createCLI(): Command {
  const program = new Command()

  program
    .name('lombok-worker-test')
    .description('Test framework for Lombok docker workers')
    .version('1.0.0')
    .requiredOption('--config <path>', 'Path to test configuration JSON file')
    .option('--docker-host <host>', 'Docker host (default: local socket)')
    .option(
      '--job-id <id>',
      'Run only specific job(s) by ID (can be specified multiple times)',
      (value, previous: string[] = []) => {
        previous.push(value)
        return previous
      },
    )
    .option('--no-cleanup', 'Do not remove container after test')
    .option('--verbose', 'Print detailed logs')
    .option('--build-only', 'Only build image, do not run tests')
    .option(
      '--live-logs',
      'Stream worker container logs to stdout while tests run',
    )
    .option(
      '--no-cache',
      'Build Docker image without using the layer cache (local and SSH builds)',
    )
    .action(async (options) => {
      try {
        // Load config
        const config = loadConfig(options.config)

        // Merge CLI flags
        const mergedConfig = mergeConfigFlags(config, {
          dockerHost: options.dockerHost,
          jobIds: options.jobId,
          buildOnly: options.buildOnly,
          noCleanup: options.noCleanup,
          verbose: options.verbose,
          liveLogs: options.liveLogs,
          noCache: options.cache === false ? true : undefined,
        })

        // Run tests
        const runner = new TestRunner()
        const result = await runner.run(mergedConfig, {
          buildOnly: options.buildOnly,
          noCleanup: options.noCleanup,
          configPath: options.config,
          verbose: options.verbose,
        })

        // Print results
        console.log('\n=== Test Results ===')
        console.log(`Total jobs: ${result.results.length}`)
        console.log(`Passed: ${result.results.filter((r) => r.success).length}`)
        console.log(
          `Failed: ${result.results.filter((r) => !r.success).length}`,
        )

        if (result.errors.length > 0) {
          console.log('\nErrors:')
          result.errors.forEach((error) => {
            console.error(`  - ${error}`)
          })
        }

        if (result.results.length > 0) {
          console.log('\nJob Results:')
          result.results.forEach((jobResult) => {
            const status = jobResult.success ? '✓' : '✗'
            const id = jobResult.jobConfigId || jobResult.jobId
            ;(!jobResult.success ? console.error : console.log)(
              `  ${status} ${id}`,
            )

            if (!jobResult.success) {
              if (jobResult.error) {
                ;(!jobResult.success ? console.error : console.log)(
                  `    Error: ${jobResult.error}`,
                )
              }
              if (jobResult.validationErrors) {
                jobResult.validationErrors.forEach((err) => {
                  console.log(`    Validation: ${err}`)
                })
              }
            }
          })
        }

        // Exit with appropriate code
        process.exit(result.success ? 0 : 1)
      } catch (error) {
        console.error(
          'Error:',
          error instanceof Error ? error.message : String(error),
        )
        if (options.verbose && error instanceof Error) {
          console.error(error.stack)
        }
        process.exit(1)
      }
    })

  return program
}
