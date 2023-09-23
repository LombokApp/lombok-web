import * as Sentry from '@sentry/node'
import type { FolderOperationNameDataTypes } from '@stellariscloud/workers'
import { FolderOperationName } from '@stellariscloud/workers'
import { Queue } from 'bullmq'
import { singleton } from 'tsyringe'

import { EnvConfigProvider } from '../config/env-config.provider'
import { registerExitHandler } from '../util/process.util'

@singleton()
export class QueueService {
  queues: { [key: string]: Queue } = {}

  constructor(private readonly config: EnvConfigProvider) {
    this._setupQueue(FolderOperationName.IndexFolder)
    this._setupQueue(FolderOperationName.IndexFolderObject)
    this._setupQueue(FolderOperationName.TranscribeAudio)
    this._setupQueue(FolderOperationName.DetectObjects)
    // this._setupQueue(QueueName.GenerateHLS)
    // this._setupQueue(QueueName.GenerateMpegDash)
  }

  _setupQueue<
    N extends FolderOperationName,
    D extends FolderOperationNameDataTypes[N],
  >(name: N) {
    this.queues[name] = new Queue<D>(name, {
      connection: {
        host: this.config.getRedisConfig().host,
        port: this.config.getRedisConfig().port,
      },
    })

    this.queues[name].on('error', (error: Error) => {
      Sentry.captureException(error)
      console.error(`"${name}" queue error`, error)
    })

    registerExitHandler(async () => {
      await this.queues[name].close()
      await this.queues[name].disconnect()
    })
  }

  add<
    N extends FolderOperationName,
    D extends { [key: string]: any },
    O extends { jobId: string },
  >(...inputs: D extends undefined ? [N, O] : [N, D, O]) {
    return this.queues[inputs[0]].add(
      inputs[0],
      typeof inputs[2] === 'undefined' ? undefined : inputs[1],
      typeof inputs[2] === 'undefined' ? (inputs[1] as D) : inputs[2],
    )
  }
}
