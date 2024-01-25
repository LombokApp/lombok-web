export interface ModuleAction {
  key: string
  description: string
}

export interface ModuleMenuItem {
  label: string
  iconPath?: string
  uiName: string
}

export interface ModuleConfig {
  publicKey: string
  description: string
  subscribedEvents: string[]
  emitEvents: string[]
  actions: { folder: ModuleAction[]; object: ModuleAction[] }
  menuItems: ModuleMenuItem[]
}

export interface ConnectedModuleInstancesMap {
  [name: string]: ConnectedModuleInstance[]
}

export interface ConnectedModuleInstance {
  moduleIdentifier: string
  id: string
  name: string
  ip: string
}

export interface ModuleData {
  identifier: string
  config: ModuleConfig
}
