import type { IframeMessage } from './types'

export class IframeCommunicator {
  private messageHandlers: Map<string, (message: IframeMessage) => void> =
    new Map()
  private pendingRequests: Map<
    string,
    { resolve: (value: any) => void; reject: (error: Error) => void }
  > = new Map()

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
    // Handle pending requests
    if (message.id && this.pendingRequests.has(message.id)) {
      const request = this.pendingRequests.get(message.id)!
      this.pendingRequests.delete(message.id)

      if (message.type === 'error') {
        request.reject(new Error(message.payload?.message || 'Request failed'))
      } else {
        request.resolve(message.payload)
      }
      return
    }

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

  public async sendRequest(
    message: IframeMessage,
    timeout = 5000,
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      const id = Math.random().toString(36).substring(2, 15)
      const requestMessage = { ...message, id }

      const timeoutId = setTimeout(() => {
        this.pendingRequests.delete(id)
        reject(new Error('Request timeout'))
      }, timeout)

      this.pendingRequests.set(id, {
        resolve: (value) => {
          clearTimeout(timeoutId)
          resolve(value)
        },
        reject: (error) => {
          clearTimeout(timeoutId)
          reject(error)
        },
      })

      this.sendMessage(requestMessage)
    })
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

  public requestToken(): Promise<{
    accessToken: string
    refreshToken?: string
  }> {
    return this.sendRequest({ type: 'REQUEST_TOKEN' })
  }

  public notifyReady(): void {
    this.sendMessage({ type: 'IFRAME_READY' })
  }

  public notifyError(error: Error): void {
    this.sendMessage({
      type: 'IFRAME_ERROR',
      payload: { message: error.message, stack: error.stack },
    })
  }

  public destroy(): void {
    this.messageHandlers.clear()
    this.pendingRequests.clear()
  }
}
