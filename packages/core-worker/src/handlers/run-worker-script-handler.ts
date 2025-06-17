import fs from 'fs'
import os from 'os'
import path from 'path'
import { v4 as uuidV4 } from 'uuid'
import { $ } from 'bun'

import type {
  CoreServerMessageInterface,
  AppTask,
} from '../utils/connect-app-worker.util'
import { AppAPIError } from '../utils/connect-app-worker.util'
import { downloadFileToDisk } from '../utils/file.util'

export const runWorkerScriptHandler = async (
  task: AppTask,
  server: CoreServerMessageInterface,
) => {
  console.log('Starting work for task:', task)
  if (!task.id) {
    throw new AppAPIError('INVALID_TASK', 'Missing task id.')
  }

  const workerTaskId = task.inputData.taskId
  const appIdentifier = task.inputData.appIdentifier
  const workerIdentifier = task.inputData.workerIdentifier

  const tempDir = fs.mkdtempSync(
    path.join(os.tmpdir(), `stellaris_task_${task.id}_`),
  )

  const executionId = uuidV4()

  const workerPayloadPathname = `${appIdentifier}__${workerIdentifier}`
  const inFilepath = path.join(tempDir, `${workerPayloadPathname}.zip`)
  const workerDirectory = path.join(tempDir, workerPayloadPathname)

  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir)
  }

  const taskEnvVars = Object.keys(task.inputData.envVars ?? {}).reduce<
    string[]
  >((acc, next) => acc.concat(`-E ${next}=${task.inputData.envVars[next]}`), [])

  const appWorkerToken = 'DUMMY_APP_WORKER_TOKEN'
  const appSocketEndpoint = 'DUMMY_APP_SOCKET_ENDPOINT'
  const urls = await server.getWorkerPayloadSignedUrl(
    appIdentifier,
    workerIdentifier,
  )

  const {
    result: { url: workerPayloadSignedURL },
  } = urls

  await downloadFileToDisk(workerPayloadSignedURL, inFilepath)

  const unzipProc = Bun.spawn({
    cmd: ['unzip', inFilepath, '-d', workerDirectory],
    stdout: 'inherit',
    stderr: 'inherit',
  })
  const unzipCode = await unzipProc.exited
  if (unzipCode !== 0) {
    throw new Error('Failed to unzip worker payload')
  }

  const stellarisEnvVars = [
    `-E STELLARIS_APP_WORKER_TOKEN=${appWorkerToken}`,
    `-E STELLARIS_APP_SOCKET_ENDPOINT=${appSocketEndpoint}`,
    `-E STELLARIS_APP_TASK_EXECUTION_ID=${executionId}`,
  ]

  const envVars =
    `${taskEnvVars.join(' ').trim()} ${stellarisEnvVars.join(' ').trim()}`.trim()

  // Determine entrypoint: prefer index.js if it exists, otherwise index.ts
  let entrypoint = `index.ts`
  const jsEntrypointPath = path.join(
    workerDirectory,
    workerIdentifier,
    'index.js',
  )
  if (fs.existsSync(jsEntrypointPath)) {
    entrypoint = 'index.js'
  }
  console.log('envVars:', envVars)
  const { stdout, stderr } = await $`nsjail \
  --iface_no_lo --disable_rlimits --keep_caps --disable_clone_newpid --disable_proc \
  --chroot ${workerDirectory}/${workerIdentifier} \
  --user 1001 --group 1001 \
  --bindmount /usr/local/bin/bun:/usr/local/bin/bun \
  --bindmount_ro /lib/ld-musl-aarch64.so.1:/lib/ld-musl-aarch64.so.1 \
  --bindmount_ro /usr/lib/libstdc++.so.6:/usr/lib/libstdc++.so.6 \
  --bindmount_ro /usr/lib/libgcc_s.so.1:/usr/lib/libgcc_s.so.1 \
  --bindmount /dev/null:/dev/null \
  --bindmount /dev/random:/dev/random \
  --bindmount /dev/urandom:/dev/urandom \
  ${envVars} \
  -Mo -v -- /usr/local/bin/bun ${entrypoint}`

  console.log('ls output:', stdout.toString())
  console.error('ls error:', stderr.toString())

  // verify the content of the script (that it matches the scriptHash)

  // run the script
  //   - ~~load the worker payload~~
  //   - fetch/preprare env vars
  //     - app socket endpoint + token
  //     - worker id
  //   - nsjail + bun to execute the js script
  //     - ~~make ffmpeg and other dependencies available (in spite of nsjail)~~
  //     - add built-in npm packages (fluent-ffmpeg, app sdk, ...?)

  // remove the temporary directory
  fs.rmSync(tempDir, { recursive: true, force: true })
}
