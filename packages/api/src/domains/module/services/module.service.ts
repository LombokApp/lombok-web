import { and, eq } from 'drizzle-orm'
import * as r from 'runtypes'
import { container, Lifecycle, scoped } from 'tsyringe'
import { v4 as uuidV4 } from 'uuid'

import { EnvConfigProvider } from '../../../config/env-config.provider'
import { UnauthorizedError } from '../../../errors/auth.error'
import { OrmService } from '../../../orm/orm.service'
import { SocketService } from '../../../services/socket.service'
import type { User } from '../../user/entities/user.entity'
import { CORE_MODULE_ID } from '../constants/core-module.config'
import { ModuleSocketAPIRequest } from '../constants/module-api-messages'
import type { Module } from '../entities/module.entity'
import { modulesTable } from '../entities/module.entity'
import { moduleLogEntriesTable } from '../entities/module-log-entry.entity'

const ModuleLogEntryValidator = r.Record({
  name: r.String,
  message: r.String,
  level: r.String,
  data: r.Unknown.optional(),
})

@scoped(Lifecycle.ContainerScoped)
export class ModuleService {
  constructor(
    private readonly config: EnvConfigProvider,
    private readonly ormService: OrmService,
  ) {}

  _socketService?: SocketService

  get socketService() {
    if (!this._socketService) {
      this._socketService = container.resolve(SocketService)
    }
    return this._socketService
  }

  async listModulesAsAdmin(user: User) {
    if (!user.isAdmin) {
      throw new UnauthorizedError()
    }
    const connectedModuleInstances = this.socketService.getModuleConnections()
    return {
      connected: connectedModuleInstances,
      installed: await this.listModules(),
    }
  }

  async listModules() {
    const modules = await this.ormService.db.query.modulesTable.findMany()
    return modules
  }

  async getModuleAsAdmin(user: User, moduleId: string) {
    if (!user.isAdmin) {
      throw new UnauthorizedError()
    }

    const module = await this.ormService.db.query.modulesTable.findFirst({
      where: and(eq(modulesTable.id, moduleId), eq(modulesTable.enabled, true)),
    })

    return module
  }

  async getModule(moduleId: string) {
    const module = await this.ormService.db.query.modulesTable.findFirst({
      where: and(eq(modulesTable.id, moduleId), eq(modulesTable.enabled, true)),
    })

    return module
  }

  async getCoreModuleAsAdmin(user: User) {
    if (!user.isAdmin) {
      throw new UnauthorizedError()
    }

    return this.getCoreModule()
  }

  async getCoreModule(): Promise<Module | undefined> {
    return this.getModule(CORE_MODULE_ID)
  }

  async handleModuleRequest(moduleId: string, message: any) {
    const now = new Date()
    if (ModuleSocketAPIRequest.guard(message)) {
      console.log('handleModuleRequest(%s):', message.name, message.data)
      const requestData = message.data
      switch (message.name) {
        case 'SAVE_LOG_ENTRY':
          console.log('SAVE_LOG_ENTRY:', requestData)
          if (ModuleLogEntryValidator.guard(requestData)) {
            await this.ormService.db.insert(moduleLogEntriesTable).values([
              {
                ...requestData,
                createdAt: now,
                updatedAt: now,
                moduleId,
                id: uuidV4(),
              },
            ])
          } else {
            return {
              errorCode: 400,
              error: 'Invalid request.',
            }
          }
          break
        case 'GET_SIGNED_URLS': {
          throw new Error('Not implemented yet: "GET_SIGNED_URLS" case')
        }
        case 'GET_METADATA_SIGNED_URLS': {
          throw new Error(
            'Not implemented yet: "GET_METADATA_SIGNED_URLS" case',
          )
        }
        case 'UPDATE_CONTENT_ATTRIBUTES': {
          throw new Error(
            'Not implemented yet: "UPDATE_CONTENT_ATTRIBUTES" case',
          )
        }
        case 'UPDATE_CONTENT_METADATA': {
          throw new Error('Not implemented yet: "UPDATE_CONTENT_METADATA" case')
        }
        case 'COMPLETE_HANDLE_EVENT': {
          throw new Error('Not implemented yet: "COMPLETE_HANDLE_EVENT" case')
        }
        case 'START_HANDLE_EVENT': {
          throw new Error('Not implemented yet: "START_HANDLE_EVENT" case')
        }
        case 'FAIL_HANDLE_EVENT': {
          throw new Error('Not implemented yet: "FAIL_HANDLE_EVENT" case')
        }
      }
    }
  }
}
