import {
  Entity,
  EntityRepositoryType,
  JsonType,
  OptionalProps,
  PrimaryKey,
  Property,
} from '@mikro-orm/core'

import { BaseEntity } from '../../../entities/base.entity'
import type { ServerConfigurationData } from '../transfer-objects/server-configuration.dto'
import { ServerConfigurationRepository } from './server-configuration.repository'

@Entity({
  tableName: 'server_configuration',
  customRepository: () => ServerConfigurationRepository,
})
export class ServerConfiguration extends BaseEntity<ServerConfiguration> {
  [EntityRepositoryType]?: ServerConfigurationRepository;
  [OptionalProps]?: 'updatedAt' | 'createdAt'

  @PrimaryKey({ columnType: 'TEXT' })
  key!: string

  @Property({ customType: new JsonType(), nullable: false })
  value!: any

  toServerConfigurationData(): ServerConfigurationData {
    return this.toObject()
  }

  toJSON() {
    return this.toServerConfigurationData()
  }
}
