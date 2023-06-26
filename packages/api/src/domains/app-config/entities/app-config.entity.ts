import {
  Entity,
  EntityRepositoryType,
  JsonType,
  OptionalProps,
  PrimaryKey,
  Property,
} from '@mikro-orm/core'

import { TimestampedEntity } from '../../../entities/base.entity'
import type { AppConfigData } from '../transfer-objects/app-config.dto'
import { AppConfigRepository } from './app-config.repository'

@Entity({ customRepository: () => AppConfigRepository })
export class AppConfig extends TimestampedEntity {
  [EntityRepositoryType]?: AppConfigRepository;
  [OptionalProps]?: 'updatedAt' | 'createdAt'

  @PrimaryKey({ columnType: 'citext' })
  key!: string

  @Property({ customType: new JsonType() })
  value!: unknown

  toAppConfigData(): AppConfigData {
    return this.toObject()
  }

  toJSON() {
    return this.toAppConfigData()
  }
}
