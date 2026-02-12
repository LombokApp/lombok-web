/**
 * Restart the NestJS API by killing the `bun --watch` process.
 * The dev-entrypoint restart loop will automatically relaunch it,
 * picking up fresh environment variables.
 */

const proc = Bun.spawnSync(['pkill', '-f', 'bun --watch src/main.ts'], {
  stdio: ['inherit', 'inherit', 'inherit'],
})

if (proc.exitCode === 0) {
  // eslint-disable-next-line no-console
  console.log('Sent kill signal to API process. It will restart automatically.')
} else {
  // eslint-disable-next-line no-console
  console.error(
    'No matching API process found (pkill exit code %d).',
    proc.exitCode,
  )
  process.exit(1)
}
