import type express from 'express'
import * as r from 'runtypes'
import { container } from 'tsyringe'

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
import type { FolderWorkerKey } from '../domains/folder-operation/entities/folder-worker-key.entity'
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
): Promise<{ actor?: User; session?: Session }> => {
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
      return Promise.resolve({})

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
    user,
    worker,
    session,
  }: {
    user?: User
    worker?: FolderWorkerKey
    session?: Session
  }) => {
    if (user) {
      // TODO: fix scopes checking...
      const scopes: AuthScope[] =
        session?.scopes ?? ALLOWED_SCOPES[PlatformRole.User]

      for (const scope of requiredScopes) {
        if (!scopes.includes(scope)) {
          throw new ScopeRequiredError(requiredScopes, scopes)
        }
      }
    }

    request.user = user
    request.session = session
    request.worker = worker

    return user
  }

  const result = verify(request, scheme)

  return (result as Promise<{ user?: User; session?: Session }>).then(
    handleResult,
  )
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      session?: Session
      user?: User
      worker?: FolderWorkerKey
    }
  }
}
