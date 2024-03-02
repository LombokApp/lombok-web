import * as r from 'runtypes'

export enum QueueName {
  IndexFolder = 'IndexFolder',
  NotifyPendingEvents = 'NotifyPendingEvents',
}

export const FOLDER_OPERATION_VALIDATOR_TYPES = {
  [QueueName.IndexFolder]: r.Record({
    folderId: r.String,
    userId: r.String,
  }),
  [QueueName.NotifyPendingEvents]: r.Undefined,
}

export type AppWorkerOperationNameDataTypes = {
  [P in keyof typeof FOLDER_OPERATION_VALIDATOR_TYPES]: r.Static<
    (typeof FOLDER_OPERATION_VALIDATOR_TYPES)[P]
  >
}
