export interface HealthState {
  ok: boolean
  meta?: any
  indicators?: {
    [key: string]: HealthState
  }
}
