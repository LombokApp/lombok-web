import type { IframeMessage } from './types'

export class IframeCommunicator {
  private messageHandlers: Map<string, (message: IframeMessage) => void> =
    new Map()

  constructor() {
    this.setupMessageListener()
  }

  private setupMessageListener(): void {
    window.addEventListener('message', (event) => {
      // Only accept messages from the parent window
      if (event.source !== window.parent) {
        return
      }

      const message = event.data as IframeMessage
      if (!message || !message.type) {
        return
      }

      this.handleMessage(message)
    })
  }

  private handleMessage(message: IframeMessage): void {
    // Handle registered message handlers
    const handler = this.messageHandlers.get(message.type)
    if (handler) {
      handler(message)
    }
  }

  public sendMessage(message: IframeMessage): void {
    if (!window.parent) {
      throw new Error('No parent window available')
    }
    window.parent.postMessage(message, '*')
  }

  public onMessage(
    type: string,
    handler: (message: IframeMessage) => void,
  ): void {
    this.messageHandlers.set(type, handler)
  }

  public offMessage(type: string): void {
    this.messageHandlers.delete(type)
  }

  public notifyReady(): void {
    this.sendMessage({ type: 'APP_READY' })
  }

  public notifyError(error: Error): void {
    this.sendMessage({
      type: 'APP_ERROR',
      payload: { message: error.message, stack: error.stack },
    })
  }

  public destroy(): void {
    this.messageHandlers.clear()
  }
}
