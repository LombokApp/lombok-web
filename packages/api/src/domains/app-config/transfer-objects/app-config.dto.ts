import type { PartialWritable } from '../../../util/types.util'

export interface AppConfigRequired {
  readonly key: string
}

export interface AppConfigReadWrite {
  value: unknown
}
export interface AppConfigData extends AppConfigRequired, AppConfigReadWrite {}

export interface AppConfigCreateData
  extends AppConfigRequired,
    PartialWritable<AppConfigReadWrite> {}

export interface AppConfigUpdateData
  extends PartialWritable<AppConfigRequired & AppConfigReadWrite> {}
