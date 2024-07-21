export interface AppAction {
  key: string
  description: string
}

export interface AppMenuItem {
  label: string
  iconPath?: string
  uiName: string
}

export interface AppConfig {
  publicKey: string
  description: string
  subscribedEvents: string[]
  emitEvents: string[]
  actions: { folder: AppAction[]; object: AppAction[] }
  menuItems: AppMenuItem[]
}

export interface ConnectedAppInstancesMap {
  [appIdentifier: string]: ConnectedAppInstance[] | undefined
}

export interface ConnectedAppInstance {
  appIdentifier: string
  socketClientId: string
  name: string
  ip: string
}

export interface AppData {
  identifier: string
  config: AppConfig
}
