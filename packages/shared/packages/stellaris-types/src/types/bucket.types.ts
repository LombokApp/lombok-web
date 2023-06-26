export interface ImagePreview {
  size: number
  path: string
}

export interface ImagePreviews {
  large?: ImagePreview
  medium?: ImagePreview
  small?: ImagePreview
}

export interface IndexingJobContext {
  error?: string
  continuationToken?: string
  indexingContinuationKey?: string
  lastNotify?: number
  running: boolean
  batch: S3ObjectInternal[]
}
export interface FolderMetadata {
  indexingJobContext?: IndexingJobContext
  totalCount: number
  totalSizeBytes: number
}

export interface S3Connection {
  id: string
  name: string
  userId?: string
  endpoint: string
  region: string
  secretAccessKey?: string
  accessKeyId: string
  createdAt: number
}

export interface S3ConnectionInput {
  name: string
  endpoint: string
  region: string
  accessKeyId: string
  secretAccessKey: string
}

export interface S3ConnectionPublicDTO {
  id: string
  name: string
  endpoint: string
  region: string
  accessKeyId: string
  createdAt: number
}

export interface S3ConnectionEntity {
  name: string
  userId: string
  endpoint: string
  region: string
  accessKeyId: string
  secretAccessKey: string
}

export enum ShareType {
  PUBLIC = 'PUBLIC',
  PASSWORD_RESTRICTED = 'PASSWORD_RESTRICTED',
  USER_RESTRICTED = 'USER_RESTRICTED',
}

export interface ShareConfigurationEntity {
  id: string
  shareType: ShareType
  password: string
  userId: string
  users: string[]
  objects: { hash: string; folderId: string; objectKey: string }[]
  createdAt: number
  updatedAt: number
}

export interface TagEntity {
  id: string
  folderId: string
  name: string
  createdAt: number
  updatedAt: number
}

export interface ObjectTagEntity {
  tagId: string
  folderId: string
  name: string
  createdAt: number
}

export interface ShareConfigurationSchema {
  id: string
  shareType: ShareType
  password: string
  userId: string
  users: string[]
  objects: string
  createdAt: number
  updatedAt: number
}

export interface ObjectShareEntity {
  shareId: string
  objectKey: string
  folderId: string
  createdAt: number
}

export interface ObjectShareEntityPublicDTO {
  shareId: string
  objectKey: string
  folderId: string
}

export interface ShareConfigurationPublicDTO {
  id: string
  shareType: ShareType
  objects: { hash: string; folderId: string; objectKey: string }[]
}

export interface WorkerTokenEntity {
  id: string
  name: string
  userId: string
  tokenGeneratedAt: number
  createdAt: number
  updatedAt: number
}

export interface WorkerTokenDTO {
  id: string
  name: string
  token?: string
  tokenGeneratedAt: number
  createdAt: number
  updatedAt: number
}

export interface ShareEventPublicDTO {
  eventType: string
  timestamp: number
  context: { [key: string]: string }
}

export interface TagDTO {
  id: string
  name: string
  createdAt: number
  updatedAt: number
}

export interface ObjectTagDTO {
  id: string
  name: string
  createdAt: number
}

export interface ShareConfigurationInput {
  shareType: ShareType
  password: string
  users: string[]
  objects: { folderId: string; objectKey: string }[]
}

export interface UserEntity {
  id: string
  email: string
  profileImageUrl: string
  googleId: string
  googleAccessToken: string
  createdAt: number
  updatedAt: number
}

export interface UserDTO {
  id: string
  email: string
  profileImageUrl: string
}

export enum FolderPushMessage {
  OBJECTS_ADDED = 'OBJECTS_ADDED',
  OBJECTS_REMOVED = 'OBJECTS_REMOVED',
  OBJECTS_UPDATED = 'OBJECTS_UPDATED',
  OBJECT_ADDED = 'OBJECT_ADDED',
  OBJECT_REMOVED = 'OBJECT_REMOVED',
  OBJECT_UPDATED = 'OBJECT_UPDATED',
  FOLDER_REINDEXING = 'FOLDER_REINDEXING',
  FOLDER_REINDEXED = 'FOLDER_REINDEXED',
  FOLDER_REMOVED = 'FOLDER_REMOVED',
  GENERATE_PREVIEW_JOB = 'GENERATE_PREVIEW_JOB',
  NO_PREVIEW_GENERATION_CANDIDATES = 'NO_PREVIEW_GENERATION_CANDIDATES',
  REINDEX_BATCH_COMPLETE = 'REINDEX_BATCH_COMPLETE',
}

export enum ClientPushMessage {
  REQUEST_PREVIEW_GENERATION_JOB = 'REQUEST_PREVIEW_GENERATION_JOB',
  START_REINDEX_JOB = 'START_REINDEX_JOB',
  CONTINUE_REINDEX_JOB = 'CONTINUE_REINDEX_JOB',
}

export interface S3Object {
  /**
   * <p>The name that you assign to an object. You use the object key to retrieve the
   *          object.</p>
   */
  Key?: string
  /**
   * <p>Creation date of the object.</p>
   */
  LastModified?: Date
  /**
   * <p>The entity tag is a hash of the object. The ETag reflects changes only to the contents
   *          of an object, not its metadata. The ETag may or may not be an MD5 digest of the object
   *          data. Whether or not it is depends on how the object was created and how it is encrypted as
   *          described below:</p>
   *          <ul>
   *             <li>
   *                <p>Objects created by the PUT Object, POST Object, or Copy operation, or through the
   *                Amazon Web Services Management Console, and are encrypted by SSE-S3 or plaintext, have ETags that are
   *                an MD5 digest of their object data.</p>
   *             </li>
   *             <li>
   *                <p>Objects created by the PUT Object, POST Object, or Copy operation, or through the
   *                Amazon Web Services Management Console, and are encrypted by SSE-C or SSE-KMS, have ETags that are
   *                not an MD5 digest of their object data.</p>
   *             </li>
   *             <li>
   *                <p>If an object is created by either the Multipart Upload or Part Copy operation, the
   *                ETag is not an MD5 digest, regardless of the method of encryption. If an object
   *                is larger than 16 MB, the Amazon Web Services Management Console will upload or copy that object as a
   *                Multipart Upload, and therefore the ETag will not be an MD5 digest.</p>
   *             </li>
   *          </ul>
   */
  ETag?: string
  /**
   * <p>The algorithm that was used to create a checksum of the object.</p>
   */
  ChecksumAlgorithm?: (ChecksumAlgorithm | string)[]
  /**
   * <p>Size in bytes of the object</p>
   */
  Size?: number
  /**
   * <p>The class of storage used to store the object.</p>
   */
  StorageClass?: string
  /**
   * <p>The owner of the object</p>
   */
  Owner?: Owner
}

export declare enum ChecksumAlgorithm {
  CRC32 = 'CRC32',
  CRC32C = 'CRC32C',
  SHA1 = 'SHA1',
  SHA256 = 'SHA256',
}

export interface Owner {
  /**
   * <p>Container for the display name of the owner.</p>
   */
  DisplayName?: string
  /**
   * <p>Container for the ID of the owner.</p>
   */
  ID?: string
}

export interface S3ObjectInternal {
  lastModified: number
  eTag: string
  key: string
  checksumAlgorithm: (ChecksumAlgorithm | string)[]
  size: number
  storageClass: string
  owner: { displayName: string; id: string }
}

export interface PresignedURLResult {
  objectKey: string
  url: string
  method: 'PUT' | 'DELETE' | 'GET'
}
