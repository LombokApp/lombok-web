import fs from 'fs'
import os from 'os'
import path from 'path'
import { v4 as uuidV4 } from 'uuid'

import type {
  CoreServerMessageInterface,
  AppTask,
} from '../utils/connect-app-worker.util'
import { AppAPIError } from '../utils/connect-app-worker.util'

export const runWorkerScriptHandler = async (
  task: AppTask,
  server: CoreServerMessageInterface,
) => {
  console.log('Starting work for task:', task)
  if (!task.id) {
    throw new AppAPIError('INVALID_TASK', 'Missing task id.')
  }

  // if (!task.data.scriptHash) {
  //   throw new AppAPIError('INVALID_TASK', 'Missing scriptHash.')
  // }

  const tempDir = fs.mkdtempSync(
    path.join(os.tmpdir(), `stellaris_task_${task.id}_`),
  )

  const taskUUID = uuidV4()

  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir)
  }

  const taskEnvVars = Object.keys(task.data.envVars ?? {}).reduce<string[]>(
    (acc, next) => acc.concat(`-E ${next}=${task.data.envVars[next]}`),
    [],
  )

  const appWorkerToken = '__DUMMY_APP_WORKER_TOKEN__'
  const appSocketEndpoint = '__DUMMY_APP_SOCKET_ENDPOINT__'

  const stellarisEnvVars = [
    `STELLARIS_APP_WORKER_TOKEN=${appWorkerToken}`,
    `STELLARIS_APP_SOCKET_ENDPOINT=${appSocketEndpoint}`,
    `STELLARIS_APP_TASK_EXECUTION_ID=${taskUUID}`,
  ]

  // await $`nsjail ${taskEnvVars.join(' ')} ${stellarisEnvVars.join(' ')} -Me --chroot / -- /usr/bin/bun`

  // verify the content of the script (that it matches the scriptHash)

  // run the script
  //   - fetch/preprare env vars
  //     - app socket endpoint + token
  //     - worker id
  //   - nsjail + bun to execute the js script
  //     - make ffmpeg and other dependencies available (in spite of nsjail)

  // remove the temporary directory
  for (const f of fs.readdirSync(tempDir)) {
    fs.rmSync(path.join(tempDir, f))
  }
  fs.rmdirSync(tempDir)
}
