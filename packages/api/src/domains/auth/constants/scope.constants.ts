import type * as r from 'runtypes'

import { EnumType } from '../../../util/types.util'
import { PlatformRole } from './role.constants'

export enum AuthScope {
  ReadViewer = 'viewer:read',
  UpdateViewer = 'viewer:update',
}

export const AuthScopeType: r.Runtype<AuthScope> = EnumType(AuthScope)

const BASE_SCOPES = [AuthScope.ReadViewer, AuthScope.UpdateViewer]

const ADMIN_SCOPES = [...BASE_SCOPES]

export const ALLOWED_SCOPES: Record<PlatformRole, AuthScope[]> = {
  [PlatformRole.Anonymous]: [],
  [PlatformRole.Authenticated]: BASE_SCOPES,
  [PlatformRole.Service]: BASE_SCOPES,
  [PlatformRole.Admin]: ADMIN_SCOPES,
}

export const API_KEY_SCOPES = [AuthScope.ReadViewer]
