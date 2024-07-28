import { z } from 'zod'

export enum SignedURLsRequestMethod {
  PUT = 'PUT',
  DELETE = 'DELETE',
  GET = 'GET',
}

export const StorageProvisionTypeZodEnum = z.enum([
  'CONTENT',
  'METADATA',
  'BACKUP',
])
export type StorageProvisionType = z.infer<typeof StorageProvisionTypeZodEnum>
export const StorageProvisionTypeEnum = StorageProvisionTypeZodEnum.Enum
