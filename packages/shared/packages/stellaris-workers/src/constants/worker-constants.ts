import * as r from 'runtypes'

// export enum FolderOperationName {
//   IndexFolder = 'IndexFolder',
//   IndexFolderObject = 'IndexFolderObject',
//   TranscribeAudio = 'TranscribeAudio',
//   DetectObjects = 'DetectObjects',
//   // GenerateHLS = 'GenerateHLS',
//   // GenerateMpegDash = 'GenerateMpegDash',
// }

export enum FolderOperationName {
  IndexFolderObject = 'IndexFolderObject',
  TranscribeAudio = 'TranscribeAudio',
  DetectObjects = 'DetectObjects',
  // GenerateHLS = 'GenerateHLS',
  // GenerateMpegDash = 'GenerateMpegDash',
}

export const FOLDER_OPERATION_VALIDATOR_TYPES = {
  [FolderOperationName.IndexFolderObject]: r.Record({
    folderId: r.String,
    objectKey: r.String,
  }),
  [FolderOperationName.TranscribeAudio]: r.Record({
    folderId: r.String,
    objectKey: r.String,
  }),
  [FolderOperationName.DetectObjects]: r.Record({
    folderId: r.String,
    objectKey: r.String,
  }),
  // [QueueName.GenerateMpegDash]: { folderId: string; objectKey: string }
  // [QueueName.GenerateHLS]: { folderId: string; objectKey: string }
}

type InputOutputObjectsResolverType<
  T extends keyof typeof FOLDER_OPERATION_VALIDATOR_TYPES,
> = (
  op: T,
  data: r.Static<(typeof FOLDER_OPERATION_VALIDATOR_TYPES)[T]>,
) => {
  inputObjects: { folderId: string; objectKey?: string }[]
  outputObjects: { folderId: string; objectKey?: string }[]
}

type InputObjectsResolversType = {
  [P in keyof typeof FOLDER_OPERATION_VALIDATOR_TYPES]: InputOutputObjectsResolverType<P>
}

export const FOLDER_OPERATION_INPUT_OUTPUT_RESOLVERS: InputObjectsResolversType =
  {
    [FolderOperationName.IndexFolderObject]: (_op, data) => ({
      inputObjects: [{ folderId: data.folderId, objectKey: data.objectKey }],
      outputObjects: [],
    }),
    [FolderOperationName.TranscribeAudio]: (_op, data) => ({
      inputObjects: [{ folderId: data.folderId, objectKey: data.objectKey }],
      outputObjects: [],
    }),
    [FolderOperationName.DetectObjects]: (_op, data) => ({
      inputObjects: [{ folderId: data.folderId, objectKey: data.objectKey }],
      outputObjects: [],
    }),
    // [QueueName.GenerateMpegDash]: { folderId: string; objectKey: string }
    // [QueueName.GenerateHLS]: { folderId: string; objectKey: string }
  }

// TODO: replace this with automatically generated type mapping from FolderOperationValidatorTypes
export type FolderOperationNameDataTypes = {
  [P in keyof typeof FOLDER_OPERATION_VALIDATOR_TYPES]: r.Static<
    (typeof FOLDER_OPERATION_VALIDATOR_TYPES)[P]
  >
}

export interface WorkerTask<T, N> {
  id: string
  name: N
  data: T
}
