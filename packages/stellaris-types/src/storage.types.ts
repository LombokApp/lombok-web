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
export const StorageProvisionTypeEnum = StorageProvisionTypeZodEnum.Enum

export const s3LocationEndpointSchema = z
  .string()
  .url()
  .refine(
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
  prefix: z.string().nonempty().optional(),
})

export const accessKeyPublicSchema = z.object({
  accessKeyId: z.string(),
  accessKeyHashId: z.string(),
  endpoint: z.string(),
  endpointDomain: z.string(),
  region: z.string(),
  folderCount: z.number(),
})

export const accessKeySchema = z
  .object({
    secretAccessKey: z.string(),
  })
  .extend(accessKeyPublicSchema.shape)

export const storageProvisionSchema = z.object({
  id: z.string().uuid(),
  accessKeyHashId: z.string(),
  endpoint: z.string(),
  bucket: z.string(),
  region: z.string(),
  accessKeyId: z.string(),
  prefix: z.string().optional(),
  provisionTypes: z.array(StorageProvisionTypeZodEnum).min(1),
  label: z.string().max(32),
  description: z.string().max(128),
})

export const serverStorageSchema = z.object({
  accessKeyHashId: z.string(),
  accessKeyId: z.string(),
  endpoint: z.string(),
  bucket: z.string(),
  region: z.string(),
  prefix: z.string().nonempty().nullable(),
})

export type StorageProvisionDTO = z.infer<typeof storageProvisionSchema>
