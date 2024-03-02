declare module 'logdna-winston' {
  import TransportStream from 'winston-transport'

  declare namespace LogDNATransport {
    interface LogDNATransportOptions {
      key: string
      level?: string
      tags?: string[]
      meta?: any
      timeout?: number
      hostname?: string
      mac?: string
      ip?: string
      url?: string
      flushLimit?: number
      flushIntervalMs?: number
      shimProperties?: string[]
      indexMeta?: boolean
      app?: string
      env?: string
      baseBackoffMs?: number
      maxBackoffMs?: number
      withCredentials?: boolean
      payloadStructure?: string
      compress?: boolean
      proxy?: string
      ignoreRetryableErrors?: boolean
      sendUserAgent?: boolean
    }
  }

  declare class LogDNATransport extends TransportStream {
    constructor(options: LogDNATransport.LogDNATransportOptions)
  }

  export default LogDNATransport
}
