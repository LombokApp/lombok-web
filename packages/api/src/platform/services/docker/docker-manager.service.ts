import type { DockerAdapter } from './docker-manager.types'

export class DockerManager {
  constructor(
    private readonly dockerHostAdapters: Record<string, DockerAdapter>,
  ) {}

  async runImage(
    hostId: string,
    {
      image,
      command,
      environmentVariables = {},
    }: {
      image: string
      command?: string[]
      environmentVariables?: Record<string, string>
    },
  ): Promise<void> {
    return this.dockerHostAdapters[hostId].run({
      image,
      command,
      environmentVariables,
    })
  }
}
