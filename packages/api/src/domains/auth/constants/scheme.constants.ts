import type * as r from 'runtypes'

import { EnumType } from '../../../util/types.util'

export enum AuthScheme {
  WorkerServiceToken = 'WorkerServiceToken',
  Public = 'Public',
  AccessToken = 'AccessToken',
  RefreshToken = 'RefreshToken',
  PasswordChange = 'PasswordChange',
  EmailVerification = 'EmailVerification',
}

export const AuthSchemeType: r.Runtype<AuthScheme> = EnumType(AuthScheme)
