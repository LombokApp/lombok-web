import { Inject, Injectable, NestMiddleware } from '@nestjs/common'
import nestjsConfig from '@nestjs/config'
import { NextFunction, Request, Response } from 'express'
import mime from 'mime'
import { coreConfig } from 'src/core/config'

import { AppService } from './services/app.service'

@Injectable()
export class AppAssetsMiddleware implements NestMiddleware {
  appUiSubDomainSuffix: string
  constructor(
    private readonly appService: AppService,
    @Inject(coreConfig.KEY)
    private readonly _coreConfig: nestjsConfig.ConfigType<typeof coreConfig>,
  ) {
    // app asset requests will be hitting a hostname like <app_id>.<ui_name>.apps.<stellaris_host>:<port>
    this.appUiSubDomainSuffix = `.apps.${new URL(this._coreConfig.hostId).host}`
  }

  async use(req: Request, res: Response, next: NextFunction) {
    const host =
      'x-forwarded-host' in req.headers
        ? (req.headers['x-forwarded-host'] as string | undefined) ?? ''
        : (req.headers.host ?? '').split(':')[0]

    const parsedHost = new URL(`http://${host}`)

    if (!parsedHost.host.endsWith(this.appUiSubDomainSuffix)) {
      next()
      return
    }

    const hostnameParts = host.split('.')
    const isAppUIHost =
      hostnameParts.length === 5 && hostnameParts[2] === 'apps'
    const appIdentifier: string | undefined = isAppUIHost
      ? hostnameParts[1]
      : undefined
    const uiName: string | undefined = isAppUIHost
      ? hostnameParts[0]
      : undefined
    const resolvedContentPath = req.path === '/' ? '/index.html' : req.path
    if (!appIdentifier || !uiName) {
      return res
        .setHeader('Cross-Origin-Embedder-Policy', 'cross-origin')
        .sendStatus(404)
    }

    const mimeType = mime.getType(resolvedContentPath) ?? 'text/html'
    const returnContent = await this.appService.getContentForAppAsset(
      appIdentifier,
      uiName,
      resolvedContentPath,
    )
    if (returnContent) {
      console.log(
        '"%s" got response [%s] %d bytes',
        resolvedContentPath,
        mimeType,
        returnContent.length,
      )
      return res
        .setHeader('content-type', mimeType)
        .setHeader('Cross-Origin-Embedder-Policy', 'cross-origin')
        .send(returnContent)
        .status(200)
    } else {
      return res
        .setHeader('Cross-Origin-Embedder-Policy', 'cross-origin')
        .sendStatus(404)
    }
  }
}
