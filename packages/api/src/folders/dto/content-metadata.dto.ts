import {
  externalMetadataEntrySchema,
  inlineMetadataEntrySchema,
  metadataEntrySchema,
} from '@lombokapp/types'
import { createZodDto } from 'nestjs-zod'

export class ExternalMetadataEntryDTO extends createZodDto(
  externalMetadataEntrySchema,
) {}

export class InlineMetadataEntryDTO extends createZodDto(
  inlineMetadataEntrySchema,
) {}

// TypeScript does not allow a class to extend a constructor whose return type is a union.
// Export a class that carries the schema for Swagger/validation and generate-metadata.
export class ContentMetadataEntryDTO {
  static schema = metadataEntrySchema

  /** Present only so this class has instance shape; validation uses static schema. */
  declare readonly _schemaCarrier: unknown
}
