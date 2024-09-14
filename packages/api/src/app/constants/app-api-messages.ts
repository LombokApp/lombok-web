import * as r from 'runtypes'

export const AppSocketMessage = r
  .Literal('SAVE_LOG_ENTRY')
  .Or(r.Literal('GET_CONTENT_SIGNED_URLS'))
  .Or(r.Literal('GET_METADATA_SIGNED_URLS'))
  .Or(r.Literal('UPDATE_CONTENT_ATTRIBUTES'))
  .Or(r.Literal('UPDATE_CONTENT_METADATA'))
  .Or(r.Literal('ATTEMPT_START_HANDLE_EVENT'))
  .Or(r.Literal('COMPLETE_HANDLE_EVENT'))
  .Or(r.Literal('FAIL_HANDLE_EVENT'))

export const AppSocketAPIRequest = r.Record({
  name: AppSocketMessage,
  data: r.Unknown.optional(),
})

export type AppSocketMessageType = r.Static<typeof AppSocketMessage>
