import { z } from 'zod'

export const imageUrlsDTOSchema = z
  .object({
    small: z.string(),
    medium: z.string(),
    large: z.string(),
  })
  .meta({ id: 'ImageUrls' })
