import type { HealthState } from './health-state'

export interface HealthIndicator {
  healthState: () => HealthState
}
