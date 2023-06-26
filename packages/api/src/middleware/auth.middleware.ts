import type express from 'express'
import * as r from 'runtypes'
import { container } from 'tsyringe'

import type { Actor } from '../domains/auth/actor'
import { PlatformRole } from '../domains/auth/constants/role.constants'
import {
  AuthScheme,
  AuthSchemeType,
} from '../domains/auth/constants/scheme.constants'
import type { AuthScope } from '../domains/auth/constants/scope.constants'
import { AuthScopeType } from '../domains/auth/constants/scope.constants'
import type { Credential } from '../domains/auth/credential'
import { ApiKey } from '../domains/auth/entities/api-key.entity'
import { Session } from '../domains/auth/entities/session.entity'
import type { VerifyResult } from '../domains/auth/services/auth.service'
import { AuthService } from '../domains/auth/services/auth.service'
import { AccessTokenJWT } from '../domains/auth/services/auth-token.service'
import type { User } from '../domains/user/entities/user.entity'
import {
  AuthorizationHeaderInvalidError,
  ScopeRequiredError,
} from '../errors/auth.error'

const parseAuthorization = <
  K extends boolean | undefined,
  T extends K extends true ? string : string | undefined,
>(
  request: express.Request,
  scheme: 'bearer' | 'basic' | 'api-key',
  shouldNotThrow: K,
): T => {
  const authorization = request.headers.authorization ?? ''
  const shouldThrow = !shouldNotThrow

  if (!authorization && shouldThrow) {
    throw new AuthorizationHeaderInvalidError(authorization, scheme)
  }

  const [headerScheme = '', credentials = ''] = authorization.split(' ')

  if (
    shouldThrow &&
    (!headerScheme || !credentials || headerScheme.toLowerCase() !== scheme)
  ) {
    throw new AuthorizationHeaderInvalidError(authorization, scheme)
  }

  return (credentials.length > 0 ? credentials : undefined) as T
}

const verify = (
  request: express.Request,
  scheme: AuthScheme,
): Promise<VerifyResult> | VerifyResult => {
  const authService = container.resolve(AuthService)
  switch (scheme) {
    case AuthScheme.AccessToken:
      if (request.headers['x-api-key']) {
        return authService.verifyApiKey(
          request.headers['x-api-key'] as string,
        ) as VerifyResult
      }
      return authService.verifyAccessToken(
        parseAuthorization(request, 'bearer', true),
      )

    case AuthScheme.RefreshToken:
      return authService.verifySession(String(request.query.refresh_token))

    case AuthScheme.Public:
      if (parseAuthorization(request, 'bearer', true)) {
        return authService.verifyAccessToken(
          parseAuthorization(request, 'bearer', false),
        )
      }
      return {
        viewer: {
          id: '',
          user: {} as unknown as User,
          role: PlatformRole.Anonymous,
          authenticated: false,
        },
      }
  }
}

const AuthScopesType: r.Runtype<AuthScope[]> = r.Array(AuthScopeType)

export const expressAuthentication = async (
  request: express.Request,
  scheme: string,
  requiredScopes: string[] = [],
) => {
  AuthSchemeType.assert(scheme)
  AuthScopesType.assert(requiredScopes)

  const handleResult = ({ viewer, credential, user }: VerifyResult) => {
    let scopes: AuthScope[]

    if (!user) {
      // unauthenticated
      request.viewer = {
        id: '',
        user: {} as unknown as User,
        role: PlatformRole.Anonymous,
        authenticated: false,
      }
      return request.viewer
    }
    if (credential instanceof Session || credential instanceof ApiKey) {
      scopes = credential.scopes as AuthScope[]
    } else if (credential instanceof AccessTokenJWT) {
      scopes = credential.scp
    } else {
      scopes = []
    }

    for (const scope of requiredScopes) {
      if (!scopes.includes(scope)) {
        throw new ScopeRequiredError(requiredScopes, scopes)
      }
    }

    request.credential = credential ?? ''
    request.viewer = viewer as unknown as Actor
    request.user = user

    return viewer
  }

  const result = verify(request, scheme)

  if (typeof (result as Promise<VerifyResult>).then === 'function') {
    return (result as Promise<VerifyResult>).then(handleResult)
  }

  return Promise.resolve(handleResult(result as VerifyResult))
}

declare global {
  namespace Express {
    interface Request {
      credential: Credential
      viewer: Actor
      user: User
    }
  }
}
