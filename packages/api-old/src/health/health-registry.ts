import type { HealthIndicator } from './health-indicator'
import type { HealthState } from './health-state'

export class HealthRegistry implements HealthIndicator {
  private readonly registry = new Map<string, HealthIndicator>()

  healthState() {
    const state: HealthState = { ok: true }
    const indicators: HealthState['indicators'] = {}

    this.registry.forEach((indicator, key) => {
      indicators[key] = indicator.healthState()
      state.indicators = indicators

      if (!indicators[key].ok) {
        state.ok = false
      }
    })

    return state
  }

  register(key: string, indicator: HealthIndicator) {
    if (this.registry.has(key)) {
      throw new Error(`Cannot register duplicate health indicator "${key}"`)
    }

    this.registry.set(key, indicator)
  }

  remove(key: string) {
    this.registry.delete(key)
  }
}
