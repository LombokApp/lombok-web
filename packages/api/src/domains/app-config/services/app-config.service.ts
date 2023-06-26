import type { FilterQuery } from '@mikro-orm/core'
import { wrap } from '@mikro-orm/core'
import { Lifecycle, scoped } from 'tsyringe'

import type { AppConfig } from '../entities/app-config.entity'
import { AppConfigRepository } from '../entities/app-config.repository'
import type {
  AppConfigCreateData,
  AppConfigData,
} from '../transfer-objects/app-config.dto'

@scoped(Lifecycle.ContainerScoped)
export class AppConfigService {
  constructor(private readonly appConfigRepository: AppConfigRepository) {}

  async get(configKey: string) {
    const configRecord = await this.appConfigRepository.findOne({
      key: configKey,
    })
    return configRecord?.value
  }

  list() {
    return this.appConfigRepository.findAndCount({})
  }

  async set(body: AppConfigCreateData) {
    const appConfig = { key: body.key, value: body.value }
    await this.upsert(appConfig, {
      key: body.key,
    })
  }

  async upsert(configData: AppConfigData, where: FilterQuery<AppConfig>) {
    let config = (await this.appConfigRepository.findOne(
      where,
    )) as unknown as AppConfig | null

    if (config) {
      wrap(config).assign(configData)
    } else {
      config = this.appConfigRepository.create(configData)
    }

    await this.appConfigRepository.getEntityManager().persistAndFlush(config)
    return config
  }
}
