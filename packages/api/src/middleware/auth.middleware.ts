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
import {
  ALLOWED_SCOPES,
  AuthScopeType,
} from '../domains/auth/constants/scope.constants'
import type { Session } from '../domains/auth/entities/session.entity'
import { AuthService } from '../domains/auth/services/auth.service'
import type { User } from '../domains/user/entities/user.entity'
import {
  AuthorizationHeaderInvalidError,
  ScopeRequiredError,
} from '../errors/auth.error'

export const parseAuthorization = <
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
): Promise<{ viewer: Actor; session?: Session }> => {
  const authService = container.resolve(AuthService)
  switch (scheme) {
    case AuthScheme.WorkerAccessToken:
      return authService.verifyWorkerAccessToken(
        parseAuthorization(request, 'bearer', true),
      )

    case AuthScheme.AccessToken:
      // TODO: reimplement api key check
      // if (request.headers['x-api-key']) {
      //   return authService.verifyApiKey(
      //     request.headers['x-api-key'] as string,
      //   ) as VerifyResult
      // }
      return authService.verifySessionWithAccessToken(
        parseAuthorization(request, 'bearer', true),
      )

    case AuthScheme.RefreshToken:
      return authService.verifySessionWithRefreshToken(
        String(request.query.refresh_token),
      )

    case AuthScheme.Public:
      // if (parseAuthorization(request, 'bearer', true)) {
      //   return authService.verifyAndExtendSessionWithRefreshToken(
      //     parseAuthorization(request, 'bearer', false),
      //   )
      // }
      return Promise.resolve({
        viewer: {
          id: '',
          user: {} as unknown as User,
          role: PlatformRole.Anonymous,
          authenticated: false,
        },
      })

    case AuthScheme.PasswordChange:
      // apiKeyType = ApiKeyType.PASSWORD_CHANGE
      throw Error('Not implemented.')

    case AuthScheme.EmailVerification:
      // apiKeyType = ApiKeyType.EMAIL_VERIFICATION
      throw Error('Not implemented.')
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

  const handleResult = ({
    viewer,
    user,
    session,
  }: {
    viewer: Actor
    user?: User
    session?: Session
  }) => {
    if (!user) {
      // unauthenticated
      request.viewer = {
        id: '',
        user: {} as unknown as User,
        role: PlatformRole.Anonymous,
        authenticated: false,
      }
      request.session = session
      return request.viewer
    }

    const scopes: AuthScope[] =
      session?.scopes ?? ALLOWED_SCOPES[PlatformRole.User]

    for (const scope of requiredScopes) {
      if (!scopes.includes(scope)) {
        throw new ScopeRequiredError(requiredScopes, scopes)
      }
    }

    request.viewer = viewer as unknown as Actor
    request.user = user
    request.session = session

    return viewer
  }

  const result = verify(request, scheme)

  return (
    result as Promise<{ viewer: Actor; user?: User; session?: Session }>
  ).then(handleResult)
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      viewer: Actor
      session?: Session
      user: User
    }
  }
}
