import { z } from 'zod'

export enum SignedURLsRequestMethod {
  PUT = 'PUT',
  DELETE = 'DELETE',
  GET = 'GET',
  HEAD = 'HEAD',
}

export const StorageProvisionTypeZodEnum = z.enum([
  'CONTENT',
  'METADATA',
  'REDUNDANCY',
])
export type StorageProvisionType = z.infer<typeof StorageProvisionTypeZodEnum>
export const StorageProvisionTypeEnum = StorageProvisionTypeZodEnum.enum

export const s3LocationEndpointSchema = z.url().refine(
  (e) => {
    try {
      return new URL(e).pathname === '/'
    } catch {
      return false
    }
  },
  {
    message: 'Expected hostname.',
  },
)

export const s3LocationSchema = z.object({
  accessKeyId: z.string().min(1),
  secretAccessKey: z.string().min(1),
  endpoint: s3LocationEndpointSchema,
  bucket: z.string().min(1),
  region: z.string().min(1),
  prefix: z.string().nonempty().nullable(),
})

export const accessKeySchema = z.object({
  secretAccessKey: z.null(),
  accessKeyId: z.string(),
  accessKeyHashId: z.string(),
  endpoint: z.string(),
  endpointDomain: z.string(),
  region: z.string(),
  folderCount: z.number(),
})

export const accessKeyWithSecretSchema = accessKeySchema.extend({
  secretAccessKey: z.string(),
})

export const storageProvisionWithSecretSchema = z.object({
  id: z.guid(),
  accessKeyHashId: z.string(),
  endpoint: z.string(),
  bucket: z.string(),
  region: z.string(),
  accessKeyId: z.string(),
  secretAccessKey: z.string(),
  prefix: z.string().nonempty().nullable(),
  provisionTypes: z.array(StorageProvisionTypeZodEnum).min(1),
  label: z.string().max(32),
  description: z.string().max(128),
})

export type StorageProvisionWithSecret = z.infer<
  typeof storageProvisionWithSecretSchema
>

export const storageProvisionSchema = storageProvisionWithSecretSchema.extend({
  secretAccessKey: z.null(),
})

export const serverStorageSchema = z.object({
  accessKeyHashId: z.string(),
  accessKeyId: z.string(),
  endpoint: z.string(),
  bucket: z.string(),
  region: z.string(),
  prefix: z.string().nonempty().nullable(),
})

export const serverStorageSchemaWithSecret = serverStorageSchema.extend({
  secretAccessKey: z.string(),
})

export type ServerStorageWithSecret = z.infer<
  typeof serverStorageSchemaWithSecret
>

export type StorageProvision = z.infer<typeof storageProvisionSchema>
export type ServerStorageLocation = z.infer<typeof serverStorageSchema>
