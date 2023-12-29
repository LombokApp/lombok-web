import type { ModuleConfig } from '@stellariscloud/types'

export const CORE_MODULE_ID = '0805ac65-2cae-48c1-8ff0-d9c044d9a659'

export const CORE_MODULE_CONFIG: ModuleConfig = {
  publicKey: '',
  actions: {
    folder: [
      {
        key: 'CORE:GENERATE_MISSING_PREVIEW_VERSIONS',
        description:
          'Generate preview representations for all content in this folder',
      },
    ],
    object: [
      {
        key: 'CORE:GENERATE_PREVIEW_VERSIONS',
        description: 'Generate preview representations for this content',
        // mediaTypes: ['IMAGE', 'VIDEO', 'AUDIO', 'DOCUMENT'],
      },
    ],
  },
  emitEvents: [
    'CORE:OBJECT_ADDED',
    'CORE:OBJECT_REMOVED',
    'CORE:FOLDER_CREATED',
    'CORE:FOLDER_UPDATED',
    'CORE:FOLDER_REMOVED',
    'CORE:OBJECT_SCANNED',
    'CORE:OBJECT_ATTRIBUTES_UPDATED',
    'CORE:OBJECT_METADATA_UPDATED',
  ],
  subscribedEvents: [
    'CORE:OBJECT_ADDED',
    'CORE:OBJECT_REMOVED',
    'CORE:FOLDER_CREATED',
    'CORE:FOLDER_UPDATED',
    'CORE:FOLDER_REMOVED',
  ],
}
