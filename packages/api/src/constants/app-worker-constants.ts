import * as r from 'runtypes'

export enum QueueName {
  IndexFolder = 'IndexFolder',
  IndexAllUnindexedInFolder = 'IndexAllUnindexedInFolder',
  ExecuteUnstartedWork = 'ExecuteUnstartedWork',
}

export const FOLDER_OPERATION_VALIDATOR_TYPES = {
  [QueueName.IndexFolder]: r.Record({
    folderId: r.String,
    userId: r.String,
  }),
  [QueueName.ExecuteUnstartedWork]: r.Undefined,
  [QueueName.IndexAllUnindexedInFolder]: r.Record({
    folderId: r.String,
    userId: r.String,
  }),
}

export type AppWorkerOperationNameDataTypes = {
  [P in keyof typeof FOLDER_OPERATION_VALIDATOR_TYPES]: r.Static<
    (typeof FOLDER_OPERATION_VALIDATOR_TYPES)[P]
  >
}
