export interface ModuleAction {
  key: string
  description: string
}

export interface ModuleConfig {
  publicKey: string
  subscribedEvents: string[]
  emitEvents: string[]
  actions: { folder: ModuleAction[]; object: ModuleAction[] }
}

export interface ConnectedModuleInstancesMap {
  [clientId: string]:
    | {
        [name: string]: ConnectedModuleInstance | undefined
      }
    | undefined
}

export interface ConnectedModuleInstance {
  id: string
  name: string
  ip: string
}
