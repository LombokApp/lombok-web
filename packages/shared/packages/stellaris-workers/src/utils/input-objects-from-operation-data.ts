import type {
  FolderOperationName,
  FolderOperationNameDataTypes,
} from '../constants/worker-constants'
import { FOLDER_OPERATION_INPUT_OUTPUT_RESOLVERS } from '../constants/worker-constants'

export const inputOutputObjectsFromOperationData = <
  T extends FolderOperationName,
>(
  operationName: T,
  data: FolderOperationNameDataTypes[T],
): {
  inputObjects: { folderId: string; objectKey?: string }[]
  outputObjects: { folderId: string; objectKey?: string }[]
} => {
  return FOLDER_OPERATION_INPUT_OUTPUT_RESOLVERS[operationName](
    operationName,
    data,
  )
}
