import type * as r from 'runtypes'

import { EnumType } from '../../../util/types.util'
import { PlatformRole } from './role.constants'

export enum AuthScope {
  ReadViewer = 'viewer:read',
  UpdateViewer = 'viewer:update',
  CreateUsers = 'users:create',
  ReadUsers = 'users:read',
  UpdateUsers = 'users:update',
  ReadAppConfig = 'app-config:read',
  CreateAppConfig = 'app-config:create',
}
export const AuthScopeType: r.Runtype<AuthScope> = EnumType(AuthScope)

const baseScopes = [AuthScope.ReadViewer, AuthScope.UpdateViewer]

const readScopes = [...baseScopes]

const manageScopes = [...readScopes, AuthScope.ReadUsers]

const adminScopes = [...manageScopes]

export const ALLOWED_SCOPES: Record<PlatformRole, AuthScope[]> = {
  [PlatformRole.Anonymous]: [],
  [PlatformRole.Authenticated]: baseScopes,
  [PlatformRole.Admin]: adminScopes,
}

export const API_KEY_SCOPES = [AuthScope.ReadViewer]
