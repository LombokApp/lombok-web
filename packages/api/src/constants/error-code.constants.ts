export enum ServiceErrorCode {
  // Auth domain
  LoginInvalid = 'login.invalid',
  SessionNotFound = 'session.notFound',
  ApiKeyNotFound = 'apiKey.notFound',
  AccessTokenNotFound = 'accessToken.notFound',
  AppInternalError = 'app.internalError',
  AppNotFound = 'app.notFound',
  AuthForbidden = 'auth.forbidden',
  AuthExpired = 'auth.expired',
  AuthUnauthorized = 'auth.unauthorized',

  // User domain
  UserNotFound = 'user.notFound',
  UserEmailNotVerified = 'user.emailNotVerified',
  UserIdentityConflict = 'user.identityConflict',

  FolderNotFoundError = 'folder.notFound',
  FolderForbidden = 'folder.notAuthorized',
  FolderInvalidError = 'folder.invalid',
  FolderShareNotFoundError = 'folderShare.notFound',
  FolderObjectNotFoundError = 'folderObject.notFound',
  FolderPermissionInvalid = 'folder.permissionInvalid',
  FolderTagNotFound = 'folderTag.notFound',
  FolderTagInvalid = 'folderTag.invalid',
  FolderMetadataForbidden = 'folderMetadata.notAuthorized',
  ObjectTagInvalid = 'ObjectTag.invalid',

  S3ConnectionNotFoundError = 's3Connection.notFound',
  S3ConnectionForbidden = 's3Connection.notAuthorized',
  S3ConnectionInvalidError = 's3Connection.invalid',

  FolderOperationInvalidError = 'folderOperation.invalid',
  FolderOperationNotFoundError = 'folderOperation.notFound',
}
