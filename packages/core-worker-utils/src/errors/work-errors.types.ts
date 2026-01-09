import {
  jsonSerializableObjectSchema,
  requeueConfigSchema,
} from '@lombokapp/types'
import { z } from 'zod'

export const errorOriginSchema = z.enum(['internal', 'app'])
export const errorClassSchema = z.enum(['transient', 'permanent']).optional()

export type ErrorOrigin = z.infer<typeof errorOriginSchema>

// {
//   "type": "work_error",
//   "origin": "internal | app",
//   "requeue": true | false,
//   "message": "human-readable summary",
//   "code": "stable_machine_code",
//   "cause": { /* same shape as this object */ },
// }

const errorEnvelopeBaseSchema = z.object({
  name: z.string().min(1),
  origin: errorOriginSchema,
  class: errorClassSchema,
  code: z.string().min(1),
  details: jsonSerializableObjectSchema.optional(),
  message: z.string().min(1),
  stack: z.string().optional(),
  requeue: requeueConfigSchema.optional(),
})

export type AsyncWorkErrorEnvelope = z.infer<typeof errorEnvelopeBaseSchema> & {
  cause?: AsyncWorkErrorEnvelope
}

export const errorEnvelopeSchema: z.ZodType<AsyncWorkErrorEnvelope> = z.lazy(
  () =>
    errorEnvelopeBaseSchema.extend({
      cause: errorEnvelopeSchema.optional(),
    }),
)
