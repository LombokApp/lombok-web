export enum ServiceErrorKey {
  InvalidSortColumn = 'core.invalidSortColumn',
  LoginInvalid = 'core.loginInvalid',
  SessionNotFound = 'session.notFound',
  SessionInvalid = 'session.invalid',
  SessionExpired = 'session.expired',
  AccessTokenNotFound = 'accessToken.notFound',
  AuthForbidden = 'auth.forbidden',
  AccessTokenInvalid = 'auth.accessTokenInvalid',
  AuthExpired = 'auth.expired',
  AuthUnauthorized = 'auth.unauthorized',

  UserNotFound = 'user.notFound',
  UserEmailNotVerified = 'user.emailNotVerified',
  UserIdentityConflict = 'user.identityConflict',

  FolderNotFound = 'folder.notFound',
  FolderForbidden = 'folder.notAuthorized',
  FolderInvalid = 'folder.invalid',
  FolderShareNotFound = 'folderShare.notFound',
  FolderObjectNotFound = 'folderObject.notFound',
  FolderPermissionInvalid = 'folder.permissionInvalid',
  FolderPermissionUnauthorized = 'folder.permissionUnauthorized',
  FolderMetadataWriteUnauthorized = 'folderMetadata.writeUnauthorized',

  ServerConfigurationNotFoundError = 'serverConfiguration.notFound',
  ServerConfigurationInvalid = 'serverConfiguration.invalid',

  LocationNotFoundError = 'location.notFound',
  LocationInvalidError = 'location.invalid',
}
