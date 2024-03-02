import type * as r from 'runtypes'

import { EnumType } from '../../../util/types.util'
import { PlatformRole } from './role.constants'

export enum AuthScope {
  ReadViewer = 'viewer:read',
  UpdateViewer = 'viewer:update',

  ReadUsers = 'user:read',
  CreateUsers = 'user:create',
  DeleteUsers = 'user:delete',
  ManageUsers = 'user:manage',

  ReadBackupLocation = 'backup_location:read',
  UpdateBackupLocation = 'backup_location:update',
  DeleteBackupLocation = 'backup_location:delete',
  CreateBackupLocation = 'backup_location:create',
  ReadUserFoldersLocation = 'user_folders_location:read',
  UpdateUserFoldersLocation = 'user_folders_location:update',
  DeleteUserFoldersLocation = 'user_folders_location:delete',
  CreateUserFoldersLocation = 'user_folders_location:create',
  ReadMetadataLocation = 'metadata_location:read',
  UpdateMetadataLocation = 'metadata_location:update',
  DeleteMetadataLocation = 'metadata_location:delete',
  CreateMetadataLocation = 'metadata_location:create',

  ReadPublicServerSettings = 'public_server_settings:read',
  ReadServerSettings = 'server_settings:read',
  UpdateServerSettings = 'server_settings:update',

  ReadServerModules = 'server_modules:read',
  UpdateServerModules = 'server_modules:update',

  ReadServerWorkerKey = 'server_worker_key:read',
  CreateServerWorkerKey = 'server_worker_key:create',
  UpdateServerWorkerKey = 'server_worker_key:update',
  DeleteServerWorkerKey = 'server_worker_key:delete',
}

export const AuthScopeType: r.Runtype<AuthScope> = EnumType(AuthScope)

const BASE_SCOPES = [
  AuthScope.ReadViewer,
  AuthScope.UpdateViewer,
  AuthScope.ReadBackupLocation,
  AuthScope.ReadMetadataLocation,
  AuthScope.ReadUserFoldersLocation,
  AuthScope.ReadPublicServerSettings,
]

export const APP_ADMIN_SCOPES = [
  ...BASE_SCOPES,
  AuthScope.CreateMetadataLocation,
  AuthScope.UpdateMetadataLocation,
  AuthScope.DeleteMetadataLocation,
  AuthScope.CreateBackupLocation,
  AuthScope.UpdateBackupLocation,
  AuthScope.DeleteBackupLocation,
  AuthScope.CreateUserFoldersLocation,
  AuthScope.UpdateUserFoldersLocation,
  AuthScope.DeleteUserFoldersLocation,
  AuthScope.CreateUsers,
  AuthScope.ReadUsers,
  AuthScope.ManageUsers,
  AuthScope.DeleteUsers,
  AuthScope.ReadServerSettings,
  AuthScope.UpdateServerSettings,
  AuthScope.ReadServerWorkerKey,
  AuthScope.DeleteServerWorkerKey,
  AuthScope.CreateServerWorkerKey,
  AuthScope.UpdateServerWorkerKey,
  AuthScope.ReadServerModules,
  AuthScope.UpdateServerModules,
]

export const APP_SCOPES_BY_PLATFORM_ROLE: Record<PlatformRole, AuthScope[]> = {
  [PlatformRole.Anonymous]: [],
  [PlatformRole.User]: BASE_SCOPES,
  [PlatformRole.Service]: BASE_SCOPES,
}

export const API_KEY_SCOPES = [AuthScope.ReadViewer]
