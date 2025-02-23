import kvjs from '@heyputer/kv.js'
import { Injectable } from '@nestjs/common'

import type { KVJSOperations } from './kvjs.types'

@Injectable()
export class KVService {
  ops: KVJSOperations = new kvjs()
}
