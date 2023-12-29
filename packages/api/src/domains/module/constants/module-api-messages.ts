import * as r from 'runtypes'

export const ModuleSocketAPIRequest = r.Record({
  name: r
    .Literal('SAVE_LOG_ENTRY')
    .Or(r.Literal('GET_SIGNED_URLS'))
    .Or(r.Literal('GET_METADATA_SIGNED_URLS'))
    .Or(r.Literal('UPDATE_CONTENT_ATTRIBUTES'))
    .Or(r.Literal('UPDATE_CONTENT_METADATA'))
    .Or(r.Literal('COMPLETE_HANDLE_EVENT'))
    .Or(r.Literal('START_HANDLE_EVENT'))
    .Or(r.Literal('FAIL_HANDLE_EVENT')),
  data: r.Unknown,
})
