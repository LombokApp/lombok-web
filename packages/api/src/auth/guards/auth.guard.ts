import type { CanActivate, ExecutionContext } from '@nestjs/common'
import { Injectable, UnauthorizedException } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import type { Request } from 'express'

import {
  APP_JWT_SUB_PREFIX,
  APP_USER_JWT_SUB_PREFIX,
  AuthTokenInvalidError,
  JWTService,
  USER_JWT_SUB_PREFIX,
} from '../services/jwt.service'
import { AllowedActor } from './auth.guard-config'

const BEARER_PREFIX = 'Bearer '

interface AuthGuardConfigType {
  config: AllowedActor[]
}

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JWTService,
    private readonly reflector: Reflector,
  ) {}
  canActivate(context: ExecutionContext): boolean | Promise<boolean> {
    const request: Request = context.switchToHttp().getRequest()
    const authHeader = request.header('Authorization')
    if (authHeader?.startsWith(BEARER_PREFIX)) {
      const config = this.resolveConfig(context)
      const token = authHeader.slice(BEARER_PREFIX.length)
      const decodedJWT = this.jwtService.decodeJWT(token)
      if (!decodedJWT.payload || typeof decodedJWT.payload == 'string') {
        throw new AuthTokenInvalidError(token)
      }

      if (decodedJWT.payload.sub?.startsWith(USER_JWT_SUB_PREFIX)) {
        // user
        this.jwtService.verifyJWT(token)
        return true
      } else if (decodedJWT.payload.sub?.startsWith(APP_USER_JWT_SUB_PREFIX)) {
        // app user
        this.jwtService.verifyAppUserJWT(token)
        return true
      } else if (decodedJWT.payload.sub?.startsWith(APP_JWT_SUB_PREFIX)) {
        // app
        const publicKey = '' // load app public key
        const appIdentifier = ''
        this.jwtService.verifyAppJWT(appIdentifier, publicKey, token)
        return true
      }

      console.log('decodedJWT:', decodedJWT)
      return true
    }
    throw new UnauthorizedException()
  }

  resolveConfig(context: ExecutionContext) {
    const handlerConfig = this.reflector.get<AuthGuardConfigType | undefined>(
      'authGuardConfig',
      context.getHandler(),
    )
    if (typeof handlerConfig !== 'undefined') {
      return handlerConfig
    }
    const controllerConfig = this.reflector.get<
      AuthGuardConfigType | undefined
    >('authGuardConfig', context.getClass())
    if (typeof controllerConfig !== 'undefined') {
      return controllerConfig
    }

    return { allowedActors: [AllowedActor.APP, AllowedActor.APP_USER] }
  }
}
