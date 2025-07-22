import { createZodDto } from '@anatine/zod-nestjs'
import { extendApi } from '@anatine/zod-openapi'
import {
  externalMetadataEntrySchema,
  inlineMetadataEntrySchema,
  metadataEntrySchema,
} from '@stellariscloud/types'

export class ExternalMetadataEntryDTO extends createZodDto(
  externalMetadataEntrySchema,
) {}

export class InlineMetadataEntryDTO extends createZodDto(
  inlineMetadataEntrySchema,
) {}

export const mappingExtendedMetadataEntrySchema = extendApi(
  metadataEntrySchema,
  {
    discriminator: {
      propertyName: 'type',
      mapping: {
        external: '#/components/schemas/ExternalMetadataEntryDTO',
        inline: '#/components/schemas/InlineMetadataEntryDTO',
      },
    },
  },
)
export class ContentMetadataEntryDTO extends createZodDto(
  mappingExtendedMetadataEntrySchema,
) {}
