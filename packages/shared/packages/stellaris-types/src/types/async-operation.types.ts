export enum AsyncOpType {
  GENERATE_OBJECT_PREVIEWS = 'GENERATE_OBJECT_PREVIEWS',
}

export interface AsyncOperation {
  id: string
  opType: AsyncOpType
  inputs: { folderId: string; objectKey: string }[]
  config: { [key: string]: any }
}
