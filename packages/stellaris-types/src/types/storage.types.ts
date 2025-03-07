import { z } from 'zod'

export enum SignedURLsRequestMethod {
  PUT = 'PUT',
  DELETE = 'DELETE',
  GET = 'GET',
}

export const UserStorageProvisionTypeZodEnum = z.enum([
  'CONTENT',
  'METADATA',
  'REDUNDANCY',
])
export type UserStorageProvisionType = z.infer<
  typeof UserStorageProvisionTypeZodEnum
>
export const UserStorageProvisionTypeEnum = UserStorageProvisionTypeZodEnum.Enum

export const s3LocationSchema = z.object({
  accessKeyId: z.string().min(1),
  secretAccessKey: z.string().min(1),
  endpoint: z
    .string()
    .url()
    .refine(
      (e) => {
        try {
          return new URL(e).pathname === '/'
        } catch (error) {
          return false
        }
      },
      {
        message: 'Expected hostname but got URL.',
      },
    ),
  bucket: z.string().min(1),
  region: z.string().min(1),
  prefix: z.string().min(1).optional(),
})

export const serverStorageLocationInputSchema = s3LocationSchema
