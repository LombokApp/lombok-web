import * as z from 'zod'

export const AppSocketMessage = z.enum([
  'SAVE_LOG_ENTRY',
  'GET_CONTENT_SIGNED_URLS',
  'GET_METADATA_SIGNED_URLS',
  'UPDATE_CONTENT_METADATA',
  'ATTEMPT_START_HANDLE_TASK',
  'COMPLETE_HANDLE_TASK',
  'FAIL_HANDLE_TASK',
])

export const AppSocketAPIRequest = z.object({
  name: AppSocketMessage,
  data: z.unknown().optional(),
})
