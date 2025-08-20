import { createZodDto } from '@anatine/zod-nestjs'
import { z } from 'zod'

export class StringMapDTO extends createZodDto(z.record(z.string())) {}
