import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

// The resolved (addressing-only) storage target returned in a folder response.
// Discriminated on a wire-only `kind`: BUILTIN (the embedded provision — no
// stored row, hence no id/userId) vs SERVER/USER (backed by a persisted
// storage_locations row). The DB column (kind) only ever holds SERVER/USER;
// BUILTIN exists only here so consumers can tell a row-backed target from the
// embedded one.
const baseTarget = {
  label: z.string(),
  endpoint: z.string(),
  region: z.string(),
  bucket: z.string(),
  prefix: z.string().nonempty().nullable(),
  accessKeyId: z.string(),
  accessKeyHashId: z.string(),
}

const persistedTarget = {
  id: z.guid(),
  userId: z.guid().optional(),
  ...baseTarget,
}

export const storageTargetDTOSchema = z
  .discriminatedUnion('kind', [
    z.object({ kind: z.literal('BUILTIN'), ...baseTarget }),
    z.object({ kind: z.literal('SERVER'), ...persistedTarget }),
    z.object({ kind: z.literal('USER'), ...persistedTarget }),
  ])
  .meta({ id: 'StorageTarget' })

// @ts-expect-error - Union type causes TypeScript error with class extension in Zod v4
export class StorageTargetDTO extends createZodDto(storageTargetDTOSchema) {}
