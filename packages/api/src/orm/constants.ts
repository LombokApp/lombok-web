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

export const SHARED_ACL_SCHEMA = 'shared_acl'
export const SHARED_ACL_FOLDER_VIEW = 'folder_acl_context'
