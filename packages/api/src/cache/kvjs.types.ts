import type kvjs from '@heyputer/kv.js'
import type { Promisify } from '@stellariscloud/utils'

export type KVJSOperations = Omit<
  {
    [K in keyof typeof kvjs.prototype]: (typeof kvjs.prototype)[K]
  },
  | 'store'
  | 'storeSet'
  | 'expireTimes'
  | 'cleanupLoop'
  | '_checkAndRemoveExpiredKey'
  | '_initCleanupLoop'
  | '_haversineDistance'
  | '_convertDistance'
  | '_encodeGeohash'
>

export type AdapterMap = {
  [K in keyof KVJSOperations]: string | Promisify<KVJSOperations[K]>
}
