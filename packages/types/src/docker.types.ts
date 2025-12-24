import type { JsonSerializableObject } from './json.types'
import type { StorageAccessPolicy } from './task.types'

export interface ExecuteAppDockerJobOptions {
  appIdentifier: string
  profileIdentifier: string
  jobIdentifier: string
  jobData: JsonSerializableObject
  storageAccessPolicy?: StorageAccessPolicy
  asyncTaskId?: string
}
