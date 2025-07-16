import fs from 'fs'
import os from 'os'
import path from 'path'
import { v4 as uuidV4 } from 'uuid'
import { $ } from 'bun'

import { downloadFileToDisk } from '../../utils/file.util'
import {
  AppAPIError,
  AppTask,
  CoreServerMessageInterface,
} from '@stellariscloud/app-worker-sdk'

export const runWorkerScriptHandler = async (
  task: AppTask,
  server: CoreServerMessageInterface,
) => {
  // console.log('Starting work for task:', task)
  console.log('About to start task:', task.inputData.taskId)

  if (!task.id) {
    throw new AppAPIError('INVALID_TASK', 'Missing task id.')
  }

  const workerTaskId = task.inputData.taskId
  const attemptStartHandleResponse =
    await server.attemptStartHandleTaskById(workerTaskId)

  if (attemptStartHandleResponse.error) {
    throw new AppAPIError(
      attemptStartHandleResponse.error.code,
      attemptStartHandleResponse.error.message,
    )
  }

  const workerTask = attemptStartHandleResponse.result

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

  const { result: workerExecutionDetails } =
    await server.getWorkerExecutionDetails(appIdentifier, workerIdentifier)

  const taskEnvVars = Object.keys(task.inputData.envVars ?? {}).reduce<
    string[]
  >((acc, next) => acc.concat(`${next}=${task.inputData.envVars[next]}`), [])

  const workerScriptEnvVars = Object.keys(
    workerExecutionDetails.envVars ?? {},
  ).reduce<string[]>(
    (acc, next) =>
      acc.concat(
        `WORKER_SCRIPT_VAR_${next.trim()}=${workerExecutionDetails.envVars[next].trim()}`,
      ),
    [],
  )

  console.log(
    'About to download worker payload:',
    workerExecutionDetails.payloadUrl,
  )
  await downloadFileToDisk(workerExecutionDetails.payloadUrl, inFilepath)

  const unzipProc = Bun.spawn({
    cmd: ['unzip', inFilepath, '-d', workerDirectory],
    stdout: 'inherit',
    stderr: 'inherit',
  })
  const unzipCode = await unzipProc.exited
  if (unzipCode !== 0) {
    throw new Error('Failed to unzip worker payload')
  }
  const workerWrapperScript = 'worker-script-wrapper.ts'
  const workerScriptWrapperPath = path.join(__dirname, workerWrapperScript)
  fs.copyFileSync(
    workerScriptWrapperPath,
    path.join(workerDirectory, workerWrapperScript),
  )

  const envVars = taskEnvVars.concat(workerScriptEnvVars).map((v) => v.trim())

  console.log('workerScriptEnvVars:', workerScriptEnvVars)
  console.log('taskEnvVars:', taskEnvVars)
  console.log('envVars:', envVars)
  const entrypoint = fs.existsSync(
    path.join(workerDirectory, workerIdentifier, 'index.js'),
  )
    ? `index.js`
    : `index.ts`

  const workerStartContext = {
    scriptPath: `./${workerIdentifier}/${entrypoint}`,
    workerToken: workerExecutionDetails.workerToken,
    executionId,
    workerIdentifier,
    serverBaseUrl: server.getServerBaseUrl(),
  }

  const { exitCode } = await $`nsjail \
  --disable_clone_newnet --disable_rlimits --keep_caps --disable_clone_newpid --disable_proc \
  --chroot ${workerDirectory} \
  --user 1001 --group 1001 \
  --bindmount /usr/local/bin/bun:/usr/local/bin/bun \
  --bindmount_ro /lib/ld-musl-aarch64.so.1:/lib/ld-musl-aarch64.so.1 \
  --bindmount_ro /usr/lib/libstdc++.so.6:/usr/lib/libstdc++.so.6 \
  --bindmount_ro /usr/lib/libgcc_s.so.1:/usr/lib/libgcc_s.so.1 \
  --bindmount_ro /usr/src/app/node_modules:/node_modules \
  --bindmount_ro /usr/src/app/packages/core-worker/src/handlers/run-worker-script/tsconfig.worker-script.json:/tsconfig.json \
  --bindmount_ro /usr/src/app/packages/app-worker-sdk:/builtins/app-worker-sdk \
  --bindmount /dev/null:/dev/null \
  --bindmount /dev/random:/dev/random \
  --bindmount /dev/urandom:/dev/urandom \
  ${[...envVars.map((v) => `-E${v}`)]} \
  -Mo -v -- /usr/local/bin/bun ./${workerWrapperScript} ${JSON.stringify(
    workerStartContext,
  )}`

  if (exitCode === 0) {
    // report successful completion
    await server.completeHandleTask(workerTaskId)
  } else {
    // report the failure
    await server.failHandleTask(workerTaskId, {
      code: 'APP_TASK_EXECUTION_ERROR',
      message: 'Failed to execute worker script',
    })
  }

  // run the script
  //   - ~~load the worker payload~~
  //   - ~~fetch/preprare env vars~~
  //     - ~~app socket endpoint + token~~
  //   - nsjail + bun to execute the js script
  //     - ~~make ffmpeg and other dependencies available (in spite of nsjail)~~
  //     - add built-in npm packages (fluent-ffmpeg, sharp, app sdk, ...?)

  // remove the temporary directory
  fs.rmSync(tempDir, { recursive: true, force: true })
}
