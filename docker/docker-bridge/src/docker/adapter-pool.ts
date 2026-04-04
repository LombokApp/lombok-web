import type { DockerHostEntry } from '../config.js'
import type { DockerAdapter } from './adapter.js'
import { DockerodeAdapter } from './dockerode-adapter.js'

/**
 * Lazily creates and caches DockerAdapter instances keyed by host ID.
 *
 * Reads from the parsed DOCKER_HOST_CONFIG to resolve each hostId to the
 * appropriate adapter based on the host's type and endpoint.
 */
export class AdapterPool {
  private readonly adapters = new Map<string, DockerAdapter>()
  private hosts: Partial<Record<string, DockerHostEntry>>

  constructor(hosts: Partial<Record<string, DockerHostEntry>>) {
    this.hosts = hosts
  }

  /**
   * Return the adapter for a given host ID, creating one if needed.
   * Throws if hostId is missing or unknown.
   */
  get(hostId: string): DockerAdapter {
    let adapter = this.adapters.get(hostId)
    if (!adapter) {
      const hostConfig = this.hosts[hostId]
      if (!hostConfig) {
        throw new Error(`Unknown Docker host: ${hostId}`)
      }
      adapter = this.createAdapter(hostConfig)
      this.adapters.set(hostId, adapter)
    }
    return adapter
  }

  /** Check if a host ID is configured */
  has(hostId: string): boolean {
    return hostId in this.hosts
  }

  /** Return all configured host IDs */
  hostIds(): string[] {
    return Object.keys(this.hosts)
  }

  /**
   * Update hosts at runtime. Removes adapters for hosts no longer present.
   * New hosts are lazily created on next `get()`.
   */
  updateHosts(newHosts: Record<string, DockerHostEntry>): void {
    // Remove adapters for deleted hosts
    for (const hostId of this.adapters.keys()) {
      if (!(hostId in newHosts)) {
        this.adapters.delete(hostId)
      }
    }
    // Update existing host configs (adapters will be recreated lazily if host changed)
    for (const [hostId, entry] of Object.entries(newHosts)) {
      const existing = this.hosts[hostId]
      if (
        existing &&
        (existing.host !== entry.host || existing.type !== entry.type)
      ) {
        // Host config changed, remove cached adapter so it gets recreated
        this.adapters.delete(hostId)
      }
    }
    this.hosts = newHosts
  }

  private createAdapter(config: DockerHostEntry): DockerAdapter {
    if (config.type === 'docker_endpoint') {
      return new DockerodeAdapter(config.host)
    }
    throw new Error(`Unsupported Docker host type: ${config.type}`)
  }
}
