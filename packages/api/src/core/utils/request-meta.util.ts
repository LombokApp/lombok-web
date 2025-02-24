import type { Request } from 'express'

export interface RequestMetadata {
  headers: Record<string, string>
  protocol: string
  hostname: string
  path: string
  query: Record<string, string>
  subdomains: string[]
  ip?: string
  method: string
  ips: string[]
}

export const parseRequestMetadata = (req: Request): RequestMetadata => ({
  headers: JSON.parse(
    JSON.stringify(req.headers),
  ) as RequestMetadata['headers'],
  protocol: req.protocol,
  hostname: req.hostname,
  path: req.path,
  query: JSON.parse(JSON.stringify(req.query)) as RequestMetadata['query'],
  subdomains: req.subdomains,
  ip: req.ip,
  method: req.method,
  ips: req.ips,
})
