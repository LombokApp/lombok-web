import { z } from 'zod'

/**
 * Example validation function using Zod
 * 
 * This function validates the result of a text embedding job.
 * The result should contain an array of embeddings with vectors.
 */
const embeddingResultSchema = z.object({
  embeddings: z.array(
    z.object({
      vector: z.array(z.number()),
    }),
  ),
  space: z.string(),
  model: z.string().optional(),
})

export default function validate(result: unknown) {
  const parseResult = embeddingResultSchema.safeParse(result)

  if (parseResult.success) {
    return {
      valid: true,
      errors: [],
    }
  }

  return {
    valid: false,
    errors: parseResult.error.errors.map(
      (err) => `${err.path.join('.')}: ${err.message}`,
    ),
  }
}
