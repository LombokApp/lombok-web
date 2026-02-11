import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

export class StringMapDTO extends createZodDto(
  z.record(z.string(), z.string()),
) {}
