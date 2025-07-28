import { z } from 'zod'

export const AppSocketMessage = z.enum([
  'GET_WORKER_EXECUTION_DETAILS',
  'SAVE_LOG_ENTRY',
  'GET_CONTENT_SIGNED_URLS',
  'GET_METADATA_SIGNED_URLS',
  'GET_APP_UI_BUNDLE',
  'UPDATE_CONTENT_METADATA',
  'ATTEMPT_START_HANDLE_TASK',
  'ATTEMPT_START_HANDLE_TASK_BY_ID',
  'COMPLETE_HANDLE_TASK',
  'FAIL_HANDLE_TASK',
])

export const AppSocketAPIRequest = z.object({
  name: AppSocketMessage,
  data: z.unknown().optional(),
})
