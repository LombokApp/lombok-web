import { z } from 'zod'

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

export const FolderPermissionZodEnum = z.enum([
  'FOLDER_REINDEX',
  'FOLDER_FORGET',
  'FOLDER_EDIT',
  'OBJECT_EDIT',
  'OBJECT_MANAGE',
])
export type FolderPermissionName = z.infer<typeof FolderPermissionZodEnum>
export const FolderPermissionEnum = FolderPermissionZodEnum.Enum
