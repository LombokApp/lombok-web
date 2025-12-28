import { customType } from 'drizzle-orm/pg-core'

export const bytea = customType<{
  data: Buffer
  notNull: false
  default: false
}>({
  dataType() {
    return 'bytea'
  },
})

export const SHARED_FOLDER_ACL_SCHEMA = 'shared_folder_acl'
export const SHARED_FOLDER_ACL_FOLDER_VIEW = 'folder_acl_context'
export const EXTENSIONS_SCHEMA = 'extensions'
