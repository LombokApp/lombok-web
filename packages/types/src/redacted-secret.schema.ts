import { z } from 'zod'

/**
 * Schema for a secret field that is redacted to `null` in API responses.
 *
 * The `.refine` is the guard: it makes the output serializer reject any leaked
 * (non-null) value, so a forgotten redaction fails at serialization rather than
 * shipping the secret.
 *
 * The inferred/generated type is `string | null` rather than `z.null()` on
 * purpose: openapi-fetch@0.17 drops properties typed exactly `null` from the
 * generated client type (`NonNullable<null>` is `never`, which its
 * readOnly/writeOnly key filter treats as a brand and strips). The refine is
 * runtime-only; the explicit `: boolean` return keeps Zod 4 from inferring it as
 * a type guard (which would narrow the type back to `null`), so the client still
 * sees `string | null` and keeps the property while serialization stays strict.
 */
export const redactedSecret = () =>
  z
    .string()
    .nullable()
    .refine((v): boolean => v === null, {
      message: 'redacted secret must be null',
    })
