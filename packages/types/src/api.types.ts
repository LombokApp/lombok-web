import type createFetchClient from 'openapi-fetch'

import type { paths } from './api-paths'

export type LombokApiClient = ReturnType<typeof createFetchClient<paths>>

export type UserDTO =
  paths['/api/v1/server/users/{userId}']['get']['responses']['200']['content']['application/json']['user']
export type AppDTO =
  paths['/api/v1/server/apps/{appIdentifier}']['get']['responses']['200']['content']['application/json']['app']
export type ServerTasksListRequest = NonNullable<
  paths['/api/v1/server/tasks']['get']['parameters']['query']
>
export type ServerTasksListResponse =
  paths['/api/v1/server/tasks']['get']['responses']['200']['content']['application/json']

export type ServerEventsListRequest = NonNullable<
  paths['/api/v1/server/events']['get']['parameters']['query']
>
export type ServerEventsListResponse =
  paths['/api/v1/server/events']['get']['responses']['200']['content']['application/json']

export type ServerLogsListRequest = NonNullable<
  paths['/api/v1/server/logs']['get']['parameters']['query']
>
export type ServerLogsListResponse =
  paths['/api/v1/server/logs']['get']['responses']['200']['content']['application/json']

export type LogEntryDTO =
  paths['/api/v1/server/logs/{logId}']['get']['responses']['200']['content']['application/json']['log']

// API Types for UI imports
export type FolderDTO =
  paths['/api/v1/folders/{folderId}']['get']['responses']['200']['content']['application/json']['folder']
export type FolderGetResponse =
  paths['/api/v1/folders/{folderId}']['get']['responses']['200']['content']['application/json']
export type FolderGetMetadataResponse =
  paths['/api/v1/folders/{folderId}/metadata']['get']['responses']['200']['content']['application/json']
export type FolderObjectDTO =
  paths['/api/v1/folders/{folderId}/objects/{objectKey}']['get']['responses']['200']['content']['application/json']['folderObject']
export type TaskDTO =
  paths['/api/v1/server/tasks/{taskId}']['get']['responses']['200']['content']['application/json']['task']
export type EventDTO =
  paths['/api/v1/server/events/{eventId}']['get']['responses']['200']['content']['application/json']['event']
export type AppDTOManifestInner = NonNullable<AppDTO['manifest']>
export type AppExternalWorkersDTO = AppDTO['externalWorkers'][number]
export type AccessKeyPublicDTO =
  paths['/api/v1/access-keys']['get']['responses']['200']['content']['application/json']['result'][number]
export type AccessKeysListRequest = NonNullable<
  paths['/api/v1/access-keys']['get']['parameters']['query']
>

export type ServerStorageDTO = NonNullable<
  paths['/api/v1/server/server-storage']['get']['responses']['200']['content']['application/json']['serverStorageLocation']
>
export type ServerStorageInputDTO =
  paths['/api/v1/server/server-storage']['post']['requestBody']['content']['application/json']
export type ServerSettingsGetResponse =
  paths['/api/v1/server/settings']['get']['responses']['200']['content']['application/json']

export type AppsListResponse =
  paths['/api/v1/server/apps']['get']['responses']['200']['content']['application/json']

export type AppContributionsResponse =
  paths['/api/v1/server/app-contributions']['get']['responses']['200']['content']['application/json']

export type ServerAppsListRequest = NonNullable<
  paths['/api/v1/server/apps']['get']['parameters']['query']
>

export type FolderListRequest = NonNullable<
  paths['/api/v1/folders']['get']['parameters']['query']
>

export type FolderObjectsListRequest = NonNullable<
  paths['/api/v1/folders/{folderId}/objects']['get']['parameters']['query']
>

export type ServerSettingsListResponse =
  paths['/api/v1/server/settings']['get']['responses']['200']['content']['application/json']

export type ServerUsersListRequest = NonNullable<
  paths['/api/v1/server/users']['get']['parameters']['query']
>
export type ServerTasksApiListTasksRequest = NonNullable<
  paths['/api/v1/server/tasks']['get']['parameters']['query']
>
export type ServerEventsApiListEventsRequest = NonNullable<
  paths['/api/v1/server/events']['get']['parameters']['query']
>
export type FolderEventsListRequest = NonNullable<
  paths['/api/v1/folders/{folderId}/events']['get']['parameters']['query']
>

export type FolderCreateInputDTO =
  paths['/api/v1/folders']['post']['requestBody']['content']['application/json']

export type AccessKeyBucketsListResponse =
  paths['/api/v1/access-keys/{accessKeyHashId}/buckets']['get']['responses']['200']['content']['application/json']

export type RotateAccessKeyInputDTO =
  paths['/api/v1/access-keys/{accessKeyHashId}/rotate']['post']['requestBody']['content']['application/json']

export type RotateServerAccessKeyInputDTO =
  paths['/api/v1/server/access-keys/{accessKeyHashId}/rotate']['post']['requestBody']['content']['application/json']

export type FolderShareListResponse =
  paths['/api/v1/folders/{folderId}/shares']['get']['responses']['200']['content']['application/json']
export type FolderShareUserListResponse =
  paths['/api/v1/folders/{folderId}/user-share-options']['get']['responses']['200']['content']['application/json']

export type LoginCredentialsDTO =
  paths['/api/v1/auth/login']['post']['requestBody']['content']['application/json']
export type SignupCredentialsDTO =
  paths['/api/v1/auth/signup']['post']['requestBody']['content']['application/json']
export type ViewerGetResponse =
  paths['/api/v1/viewer']['get']['responses']['200']['content']['application/json']
export type SignupResponse =
  paths['/api/v1/auth/signup']['post']['responses']['201']['content']['application/json']
export type LoginResponse =
  paths['/api/v1/auth/login']['post']['responses']['201']['content']['application/json']
