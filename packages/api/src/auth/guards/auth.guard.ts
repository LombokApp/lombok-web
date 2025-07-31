import type { CanActivate, ExecutionContext } from '@nestjs/common'
import { Injectable, UnauthorizedException } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import type { Request } from 'express'
import { UserService } from 'src/users/services/users.service'

import {
  APP_USER_JWT_SUB_PREFIX,
  AuthTokenInvalidError,
  JWTService,
  USER_JWT_SUB_PREFIX,
} from '../services/jwt.service'
import { AllowedActor, AuthGuardConfig } from './auth.guard-config'

const BEARER_PREFIX = 'Bearer '

interface AuthGuardConfigType {
  allowedActors: AllowedActor[]
}

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JWTService,
    private readonly reflector: Reflector,
  ) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request: Request = context.switchToHttp().getRequest()
    const authHeader = request.header('Authorization')
    if (authHeader?.startsWith(BEARER_PREFIX)) {
      const config = this.resolveConfig(context)
      const token = authHeader.slice(BEARER_PREFIX.length)
      const decodedJWT = this.jwtService.decodeJWT(token)
      if (!decodedJWT.payload || typeof decodedJWT.payload == 'string') {
        throw new AuthTokenInvalidError(token)
      }
      if (decodedJWT.payload.sub) {
        const subject = decodedJWT.payload.sub
        const userId = subject.split(':')[1] ?? ''
        const loadUser = async () => {
          request.user = await this.userService.getUserById({
            id: userId,
          })
        }

        if (
          subject.startsWith(USER_JWT_SUB_PREFIX) &&
          config.allowedActors.includes(AllowedActor.USER)
        ) {
          // user
          this.jwtService.verifyUserJWT(token)
          await loadUser()
          return true
        } else if (
          subject.startsWith(APP_USER_JWT_SUB_PREFIX) &&
          config.allowedActors.includes(AllowedActor.APP_USER)
        ) {
          // app user
          this.jwtService.verifyAppUserJWT({
            token,
            userId,
            appIdentifier: subject.split(':')[2] ?? '',
          })
          await loadUser()
          return true
        }
        // Failed to verify that the subject passed the guard config
        return false
      }
    }
    // Failed to parse any token
    throw new UnauthorizedException()
  }

  resolveConfig(context: ExecutionContext): AuthGuardConfigType {
    const handlerConfig = this.reflector.get(
      AuthGuardConfig,
      context.getHandler(),
    )
    if (typeof handlerConfig !== 'undefined') {
      return handlerConfig
    }
    const controllerConfig = this.reflector.get(
      AuthGuardConfig,
      context.getClass(),
    )
    if (typeof controllerConfig !== 'undefined') {
      return controllerConfig
    }

    return { allowedActors: [AllowedActor.USER] }
  }
}
