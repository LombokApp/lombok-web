export enum ServiceErrorCode {
  // Auth domain
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

  FolderNotFoundError = 'folder.notFound',
  FolderForbidden = 'folder.notAuthorized',
  FolderInvalidError = 'folder.invalid',
  FolderShareNotFoundError = 'folderShare.notFound',
  FolderObjectNotFoundError = 'folderObject.notFound',
  FolderPermissionInvalid = 'folder.permissionInvalid',
  FolderTagNotFound = 'folderTag.notFound',
  FolderTagInvalid = 'folderTag.invalid',
  ObjectTagInvalid = 'ObjectTag.invalid',

  S3ConnectionNotFoundError = 's3Connection.notFound',
  S3ConnectionForbidden = 's3Connection.notAuthorized',
  S3ConnectionInvalidError = 's3Connection.invalid',
}
