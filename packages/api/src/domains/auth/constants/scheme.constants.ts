import type * as r from 'runtypes'

import { EnumType } from '../../../util/types.util'

export enum AuthScheme {
  Public = 'Public',
  AccessToken = 'AccessToken',
  RefreshToken = 'RefreshToken',
}

export const AuthSchemeType: r.Runtype<AuthScheme> = EnumType(AuthScheme)
