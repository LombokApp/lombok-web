import { jsonSerializableObjectSchema } from '@lombokapp/types'
import { z } from 'zod'

export const errorOriginSchema = z.enum(['internal', 'app'])
export const errorClassSchema = z.enum(['transient', 'permanent'])

export type ErrorOrigin = z.infer<typeof errorOriginSchema>
export type ErrorClass = z.infer<typeof errorClassSchema>

// {
//   "type": "work_error",
//   "origin": "internal | app",
//   "class": "transient | permanent",
//   "retry": true | false,
//   "message": "human-readable summary",
//   "code": "stable_machine_code",
//   "cause": { /* same shape as this object */ },
// }

const errorEnvelopeBaseSchema = z.object({
  origin: errorOriginSchema,
  class: errorClassSchema,
  code: z.string().min(1),
  details: jsonSerializableObjectSchema.optional(),
  message: z.string().min(1),
  stack: z.string().optional(),
})

export type AsyncWorkErrorEnvelope = z.infer<typeof errorEnvelopeBaseSchema> & {
  cause?: AsyncWorkErrorEnvelope
} & (
    | {
        retry: true
        retryDelaySeconds?: number
      }
    | {
        retry: false
      }
  )

export const errorEnvelopeSchema: z.ZodType<AsyncWorkErrorEnvelope> = z.lazy(
  () =>
    z.discriminatedUnion('retry', [
      errorEnvelopeBaseSchema.extend({
        cause: errorEnvelopeSchema.optional(),
        retry: z.literal(true),
        retryDelaySeconds: z.number().int().positive().optional(),
      }),
      errorEnvelopeBaseSchema.extend({
        cause: errorEnvelopeSchema.optional(),
        retry: z.literal(false),
      }),
    ]),
)
