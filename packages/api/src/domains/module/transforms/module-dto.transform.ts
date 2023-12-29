import type { Module } from '../entities/module.entity'
import type { ModuleData } from '../transfer-objects/module.dto'

export const transformModuleToModuleDTO = (module: Module): ModuleData => ({
  id: module.id,
  name: module.name,
  config: module.config,
})
