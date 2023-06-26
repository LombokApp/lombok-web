import type { Request } from 'express'

export interface RequestMetadata {
  headers: { [key: string]: string | any }
  protocol: string
  hostname: string
  path: string
  query: { [key: string]: string | any }
  subdomains: string[]
  ip: string
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
