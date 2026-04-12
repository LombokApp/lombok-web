import {
  BadRequestException,
  Controller,
  Get,
  Header,
  Inject,
  Logger,
  Query,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common'
import type { ConfigType } from '@nestjs/config'
import { ApiExcludeController } from '@nestjs/swagger'
import type { Request, Response } from 'express'
import * as jwt from 'jsonwebtoken'
import { coreConfig } from 'src/core/config'

import { DockerBridgeService } from '../services/docker-bridge.service'

const COOKIE_NAME = 'tunnel_auth'
const TUNNEL_TOKEN_TTL_SECONDS = 86400 // 24 hours

/** Tunnel subdomain format: {label}--{publicId}--{appIdentifier}.{platformHost} */
const TUNNEL_DOMAIN_REGEX = /^(.+)--([a-z0-9]+)--([^.]+)\.(.+)$/

interface SessionTokenPayload {
  sub: string
  sid: string
  uid: string
  aud: string
  public_id: string
  mode: 'ephemeral' | 'persistent'
  iat: number
  exp: number
}

/**
 * Tunnel auth controller. Nginx routes /-/tunnel-auth* on tunnel subdomains
 * here (proxied to /api/v1/tunnel-auth*).
 *
 * Validates that:
 * 1. The token (from X-Tunnel-Token header or the already set tunnel_auth cookie) is a valid JWT
 * 2. The Host header matches the tunnel subdomain format
 * 3. The public_id in the token matches the public_id in the subdomain
 *
 * On success: sets/refreshes the tunnel_auth cookie and either redirects
 * (initial auth) or returns JSON (SW refresh).
 */
@Controller('/-/tunnel-auth')
@ApiExcludeController()
export class TunnelAuthController {
  private readonly logger = new Logger(TunnelAuthController.name)

  constructor(
    @Inject(coreConfig.KEY)
    private readonly config: ConfigType<typeof coreConfig>,
    private readonly dockerBridgeService: DockerBridgeService,
  ) {}

  /**
   * Auth endpoint. Three modes:
   * 1. X-Tunnel-Token header — XHR auth setup, sets cookie, returns JSON
   * 2. ?token= query param — browser navigation, sets cookie, redirects through SW landing
   * 3. Cookie only — SW refresh, sets fresh cookie, returns JSON
   */
  @Get()
  authenticate(
    @Req() req: Request,
    @Res() res: Response,
    @Query('token') queryToken?: string,
  ) {
    const secret = this.dockerBridgeService.getSecret()
    const tunnelHost = req.get('host') ?? ''

    // Validate the Host header matches the tunnel subdomain format
    const tunnelDomain = tunnelHost.split(':')[0] ?? ''
    const domainMatch = TUNNEL_DOMAIN_REGEX.exec(tunnelDomain)
    if (!domainMatch) {
      throw new BadRequestException(
        'Host does not match tunnel subdomain format',
      )
    }

    const domainPublicId = domainMatch[2]
    const { platformHost } = this.config

    // Validate the domain suffix matches the platform host
    if (domainMatch[4] !== platformHost) {
      throw new BadRequestException('Host does not match platform domain')
    }

    // Token sources (in priority order):
    // - X-Tunnel-Token header: explicit auth setup from clients (XHR)
    // - ?token= query param: auth setup via URL navigation
    // - tunnel_auth cookie: SW refresh (no explicit token)
    const token = req.get('X-Tunnel-Token') ?? queryToken
    let payload: SessionTokenPayload | null = null

    if (token) {
      payload = this.verifySessionToken(token, secret)
      if (!payload) {
        throw new UnauthorizedException('Invalid or expired tunnel token')
      }
    } else {
      const cookieToken = this.extractCookie(req, COOKIE_NAME)
      if (cookieToken) {
        payload = this.verifySessionToken(cookieToken, secret)
        if (!payload) {
          throw new UnauthorizedException(
            'Invalid or expired tunnel auth cookie',
          )
        }
      }
    }

    if (!payload) {
      throw new UnauthorizedException(
        'No tunnel token provided (use X-Tunnel-Token header, ?token= param, or tunnel_auth cookie)',
      )
    }

    // Only persistent sessions can use cookie-based tunnel auth
    if (payload.mode === 'ephemeral') {
      throw new UnauthorizedException(
        'Ephemeral sessions do not support cookie-based tunnel auth',
      )
    }

    // Validate that the token's public_id matches the subdomain's public_id
    if (payload.public_id !== domainPublicId) {
      throw new UnauthorizedException(
        'Token public_id does not match subdomain',
      )
    }

    // Mint a fresh cookie token with extended TTL, carrying forward the public_id
    const freshToken = jwt.sign(
      { public_id: payload.public_id, sid: payload.sid, uid: payload.uid },
      secret,
      { algorithm: 'HS256', expiresIn: TUNNEL_TOKEN_TTL_SECONDS },
    )

    res.cookie(COOKIE_NAME, freshToken, {
      httpOnly: true,
      ...(this.config.platformHttps
        ? { sameSite: 'none', secure: true }
        : { sameSite: 'lax' }),
      maxAge: TUNNEL_TOKEN_TTL_SECONDS * 1000,
      path: '/',
    })

    // CORS for XHR auth setup from the platform UI on a different origin
    const platformOrigin = this.buildTunnelOrigin(this.config.platformHost)
    res.setHeader('Access-Control-Allow-Origin', platformOrigin)
    res.setHeader('Access-Control-Allow-Credentials', 'true')
    res.setHeader(
      'Access-Control-Allow-Headers',
      'X-Tunnel-Token, Content-Type',
    )

    if (req.get('X-Tunnel-Token')) {
      // XHR auth setup — return JSON (cookie already set in response)
      res.json({ ok: true, public_id: payload.public_id })
    } else if (queryToken) {
      // Browser navigation with ?token= — redirect through landing page to register SW
      const tunnelOrigin = this.buildTunnelOrigin(tunnelDomain)
      const landingUrl = `${tunnelOrigin}/-/tunnel-auth/landing?redirect=${encodeURIComponent('/')}`
      res.redirect(302, landingUrl)
    } else {
      // SW refresh (cookie only)
      res.json({ ok: true, public_id: payload.public_id })
    }
  }

  /**
   * Auth landing page — registers the refresh service worker then
   * redirects to the actual tunnel page.
   */
  @Get('landing')
  @Header('Content-Type', 'text/html; charset=utf-8')
  landing(@Query('redirect') redirect?: string): string {
    const safeRedirect = (redirect || '/')
      .replace(/\\/g, '\\\\')
      .replace(/'/g, "\\'")

    return `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head><body>
<script>
(async function() {
  try {
    if ('serviceWorker' in navigator) {
      await navigator.serviceWorker.register('/-/tunnel-auth/sw.js', { scope: '/' });
    }
  } catch(e) {}
  location.replace('${safeRedirect}');
})();
</script>
</body></html>`
  }

  /**
   * Service worker that periodically refreshes the tunnel auth cookie
   * by calling /-/tunnel-auth (same origin, routed here by nginx).
   */
  @Get('sw.js')
  @Header('Content-Type', 'application/javascript')
  @Header('Cache-Control', 'no-cache')
  @Header('Service-Worker-Allowed', '/')
  serviceWorker(): string {
    return `
var REFRESH_INTERVAL = 4 * 60 * 60 * 1000; // 4 hours
var lastRefresh = Date.now();

self.addEventListener('install', function() { self.skipWaiting(); });
self.addEventListener('activate', function(e) { e.waitUntil(self.clients.claim()); });

self.addEventListener('fetch', function(event) {
  var now = Date.now();
  if (now - lastRefresh > REFRESH_INTERVAL) {
    lastRefresh = now;
    event.waitUntil(refreshAuth());
  }
});

async function refreshAuth() {
  try {
    await fetch('/-/tunnel-auth', { credentials: 'include' });
  } catch(e) {}
}
`
  }

  /** Extract a named cookie from the raw Cookie header. */
  private extractCookie(req: Request, name: string): string | undefined {
    const header = req.get('cookie')
    if (!header) {
      return undefined
    }
    for (const part of header.split(';')) {
      const [key, ...valueParts] = part.trim().split('=')
      if (key === name) {
        return valueParts.join('=')
      }
    }
    return undefined
  }

  /**
   * Build a full origin URL for a given hostname using platform config.
   * Produces e.g. `https://foo.example.com` or `http://foo.localhost:8080`.
   */
  private buildTunnelOrigin(hostname: string): string {
    const protocol = this.config.platformHttps ? 'https' : 'http'
    const port = this.config.platformPort
    const portSuffix =
      typeof port === 'number' && ![80, 443].includes(port) ? `:${port}` : ''
    return `${protocol}://${hostname}${portSuffix}`
  }

  private verifySessionToken(
    token: string,
    secret: string,
  ): SessionTokenPayload | null {
    try {
      const payload = jwt.verify(token, secret, {
        algorithms: ['HS256'],
      }) as SessionTokenPayload
      if (!payload.public_id) {
        return null
      }
      return payload
    } catch {
      return null
    }
  }
}
