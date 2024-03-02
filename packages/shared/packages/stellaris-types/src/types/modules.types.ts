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

export interface ConnectedAppInstancesMap {
  [name: string]: ConnectedAppInstance[]
}

export interface ConnectedAppInstance {
  appIdentifier: string
  id: string
  name: string
  ip: string
}

export interface AppData {
  identifier: string
  config: ModuleConfig
}
