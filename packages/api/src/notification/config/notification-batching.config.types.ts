export interface NotificationBatchingConfig {
  notificationsEnabled: boolean
  debounceSeconds: number
  maxIntervalSeconds?: number
}

export enum EventAggregationScope {
  NONE = 'NONE',
  FOLDER = 'FOLDER',
  FOLDER_OBJECT = 'FOLDER_OBJECT',
}
