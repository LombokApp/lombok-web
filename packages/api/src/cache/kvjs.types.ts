import type { Promisify } from '@stellariscloud/utils'
import kvjs from '@heyputer/kv.js'

export type AdapterMap = {
  [K in keyof KVJSOperations]: string | Promisify<KVJSOperations[K]>
}

/* eslint-disable @typescript-eslint/array-type */
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
