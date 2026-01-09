import type {
  JsonSerializableObject,
  JsonSerializableValue,
} from '@lombokapp/types'
import { describe, expect, it } from 'bun:test'

import { dataFromTemplate } from './data-template.util'

const contextObjects: JsonSerializableObject = {
  event: {
    data: {
      folderId: 'folder-123',
      objectKey: 'file.txt',
      nested: { value: 'nested' },
      someValue: 'testes',
    },
  },
}

describe('dataFromTemplate', () => {
  it('resolves template paths to values', async () => {
    const parsed = await dataFromTemplate(
      {
        folderId: '{{ event.data.folderId }}',
        nested: '{{event.data.nested}}',
        unchanged: 'literal',
      },
      {
        objects: contextObjects,
      },
    )

    expect(parsed).toEqual({
      folderId: 'folder-123',
      nested: { value: 'nested' },
      unchanged: 'literal',
    })
  })

  it('resolves nested template paths to values', async () => {
    const parsed = await dataFromTemplate(
      {
        folderId: '{{ event.data.folderId }}',
        multiLevelObject: {
          nestedProperty: '{{ event.data.someValue }}',
        },
        unchanged: 'literal',
      },
      {
        objects: contextObjects,
      },
    )

    expect(parsed).toEqual({
      folderId: 'folder-123',
      multiLevelObject: {
        nestedProperty: 'testes',
      },
      unchanged: 'literal',
    })
  })

  it('evaluates allowed functions with resolved arguments', async () => {
    const createPresignedUrl = (
      folderId: JsonSerializableValue | undefined,
      objectKey: JsonSerializableValue | undefined,
      method: JsonSerializableValue | undefined,
    ): JsonSerializableValue => {
      if (
        typeof folderId !== 'string' ||
        typeof objectKey !== 'string' ||
        typeof method !== 'string'
      ) {
        return null
      }

      return `https://example.com/${folderId}/${objectKey}?method=${method}`
    }

    const parsed = await dataFromTemplate(
      {
        fileUrl:
          "{{createPresignedUrl(event.data.folderId, event.data.objectKey, 'GET')}}",
      },
      { objects: contextObjects, functions: { createPresignedUrl } },
    )

    expect(parsed).toEqual({
      fileUrl: 'https://example.com/folder-123/file.txt?method=GET',
    })
  })

  it('returns null when function is not recognized', async () => {
    const parsed = await dataFromTemplate(
      {
        fileUrl:
          '{{createPresignedUrl(event.data.folderId, event.data.objectKey)}}',
      },
      { objects: contextObjects },
    )

    expect(parsed).toEqual({
      fileUrl: null,
    })
  })

  it('throws when variable path is missing and validate is enabled', () => {
    expect(
      dataFromTemplate(
        { missing: '{{ event.data.notHere }}' },
        { objects: contextObjects },
        { validate: true },
      ),
    ).rejects.toThrow('Template variable not found: event.data.notHere')
  })

  it('throws when function is not recognized and validate is enabled', () => {
    expect(
      dataFromTemplate(
        {
          fileUrl:
            '{{createPresignedUrl(event.data.folderId, event.data.objectKey)}}',
        },
        { objects: contextObjects },
        { validate: true },
      ),
    ).rejects.toThrow('Function "createPresignedUrl" is not recognized')
  })

  it('handles conditional expressions', () => {
    expect(
      dataFromTemplate(
        {
          asset_type:
            "{{event.data.mediaType === 'IMAGE' ? 'image' : 'video'}}",
        },
        { objects: { event: { data: { mediaType: 'IMAGE' } } } },
        { validate: true },
      ),
    ).resolves.toEqual({
      asset_type: 'image',
    })

    expect(
      dataFromTemplate(
        {
          asset_type:
            "{{event.data.mediaType === 'IMAGE' ? 'image' : 'video'}}",
        },
        { objects: { event: { data: { mediaType: 'VIDEO' } } } },
        { validate: true },
      ),
    ).resolves.toEqual({
      asset_type: 'video',
    })
  })

  it('handles multiple variables in a single expression', () => {
    expect(
      dataFromTemplate(
        {
          asset_id: '{{event.data.folderId}}/{{event.data.objectKey}}',
        },
        {
          objects: {
            event: { data: { folderId: 'folder-123', objectKey: 'file.txt' } },
          },
        },
        { validate: true },
      ),
    ).resolves.toEqual({
      asset_id: 'folder-123/file.txt',
    })
  })

  describe('complex expressions', () => {
    it('handles logical AND operators', () => {
      expect(
        dataFromTemplate(
          {
            result:
              "{{event.data.mediaType === 'IMAGE' && event.data.sizeBytes > 100000 ? 'large-image' : 'other'}}",
          },
          {
            objects: {
              event: {
                data: { mediaType: 'IMAGE', sizeBytes: 500000 },
              },
            },
          },
          { validate: true },
        ),
      ).resolves.toEqual({
        result: 'large-image',
      })
    })

    it('handles logical OR operators', () => {
      expect(
        dataFromTemplate(
          {
            result:
              "{{event.data.mediaType === 'IMAGE' || event.data.mediaType === 'VIDEO' ? 'media' : 'other'}}",
          },
          {
            objects: {
              event: { data: { mediaType: 'VIDEO' } },
            },
          },
          { validate: true },
        ),
      ).resolves.toEqual({
        result: 'media',
      })
    })

    it('handles number comparisons', () => {
      expect(
        dataFromTemplate(
          {
            status: '{{event.data.sizeBytes > 1000000 ? "large" : "small"}}',
          },
          {
            objects: {
              event: { data: { sizeBytes: 2000000 } },
            },
          },
          { validate: true },
        ),
      ).resolves.toEqual({
        status: 'large',
      })
    })

    it('handles string comparisons with inequality', () => {
      expect(
        dataFromTemplate(
          {
            type: "{{event.data.mediaType !== 'IMAGE' ? 'not-image' : 'image'}}",
          },
          {
            objects: {
              event: { data: { mediaType: 'VIDEO' } },
            },
          },
          { validate: true },
        ),
      ).resolves.toEqual({
        type: 'not-image',
      })
    })

    it('handles nested ternary operators', () => {
      expect(
        dataFromTemplate(
          {
            category:
              "{{event.data.mediaType === 'IMAGE' ? (event.data.sizeBytes > 1000000 ? 'large-image' : 'small-image') : 'not-image'}}",
          },
          {
            objects: {
              event: { data: { mediaType: 'IMAGE', sizeBytes: 500000 } },
            },
          },
          { validate: true },
        ),
      ).resolves.toEqual({
        category: 'small-image',
      })
    })
  })

  describe('string concatenation', () => {
    it('handles expressions mixed with literal text', () => {
      expect(
        dataFromTemplate(
          {
            path: '/storage/{{event.data.folderId}}/files/{{event.data.objectKey}}',
          },
          {
            objects: {
              event: {
                data: { folderId: 'folder-123', objectKey: 'file.txt' },
              },
            },
          },
          { validate: true },
        ),
      ).resolves.toEqual({
        path: '/storage/folder-123/files/file.txt',
      })
    })

    it('handles prefix and suffix with expressions', () => {
      expect(
        dataFromTemplate(
          {
            url: 'https://example.com/{{event.data.folderId}}?key={{event.data.objectKey}}',
          },
          {
            objects: {
              event: {
                data: { folderId: 'folder-123', objectKey: 'file.txt' },
              },
            },
          },
          { validate: true },
        ),
      ).resolves.toEqual({
        url: 'https://example.com/folder-123?key=file.txt',
      })
    })

    it('handles multiple expressions with separators', () => {
      expect(
        dataFromTemplate(
          {
            combined:
              '{{event.data.folderId}} - {{event.data.objectKey}} - {{event.data.someValue}}',
          },
          {
            objects: contextObjects,
          },
          { validate: true },
        ),
      ).resolves.toEqual({
        combined: 'folder-123 - file.txt - testes',
      })
    })
  })

  describe('nested structures', () => {
    it('handles template expressions in nested objects', () => {
      expect(
        dataFromTemplate(
          {
            metadata: {
              folder: '{{event.data.folderId}}',
              file: '{{event.data.objectKey}}',
              nested: {
                value:
                  "{{event.data.mediaType === 'IMAGE' ? 'image' : 'other'}}",
              },
            },
          },
          {
            objects: {
              event: {
                data: {
                  folderId: 'folder-123',
                  objectKey: 'file.txt',
                  mediaType: 'IMAGE',
                },
              },
            },
          },
          { validate: true },
        ),
      ).resolves.toEqual({
        metadata: {
          folder: 'folder-123',
          file: 'file.txt',
          nested: {
            value: 'image',
          },
        },
      })
    })

    it('handles template expressions in arrays', () => {
      expect(
        dataFromTemplate(
          {
            items: [
              '{{event.data.folderId}}',
              '{{event.data.objectKey}}',
              "{{event.data.mediaType === 'IMAGE' ? 'image' : 'video'}}",
            ],
          },
          {
            objects: {
              event: {
                data: {
                  folderId: 'folder-123',
                  objectKey: 'file.txt',
                  mediaType: 'IMAGE',
                },
              },
            },
          },
          { validate: true },
        ),
      ).resolves.toEqual({
        items: ['folder-123', 'file.txt', 'image'],
      })
    })

    it('handles deeply nested structures with expressions', () => {
      expect(
        dataFromTemplate(
          {
            level1: {
              level2: {
                level3: {
                  value: '{{event.data.folderId}}',
                  conditional:
                    "{{event.data.mediaType === 'IMAGE' ? 'yes' : 'no'}}",
                },
              },
            },
          },
          {
            objects: {
              event: {
                data: { folderId: 'folder-123', mediaType: 'IMAGE' },
              },
            },
          },
          { validate: true },
        ),
      ).resolves.toEqual({
        level1: {
          level2: {
            level3: {
              value: 'folder-123',
              conditional: 'yes',
            },
          },
        },
      })
    })
  })

  describe('null and undefined handling', () => {
    it('handles null values in expressions', () => {
      expect(
        dataFromTemplate(
          {
            result: "{{event.data.value === null ? 'is-null' : 'not-null'}}",
          },
          {
            objects: {
              event: { data: { value: null } },
            },
          },
          { validate: true },
        ),
      ).resolves.toEqual({
        result: 'is-null',
      })
    })

    it('handles undefined values gracefully', () => {
      expect(
        dataFromTemplate(
          {
            result: '{{event.data.missing}}',
          },
          {
            objects: {
              event: { data: {} },
            },
          },
        ),
      ).resolves.toEqual({
        result: null,
      })
    })

    it('handles null checks in conditional expressions', () => {
      expect(
        dataFromTemplate(
          {
            result:
              "{{event.data.value !== null ? event.data.value : 'default'}}",
          },
          {
            objects: {
              event: { data: { value: null } },
            },
          },
          { validate: true },
        ),
      ).resolves.toEqual({
        result: 'default',
      })
    })
  })

  describe('number operations', () => {
    it('handles arithmetic operations in expressions', () => {
      expect(
        dataFromTemplate(
          {
            doubled: '{{event.data.sizeBytes * 2}}',
          },
          {
            objects: {
              event: { data: { sizeBytes: 500000 } },
            },
          },
          { validate: true },
        ),
      ).resolves.toEqual({
        doubled: 1000000,
      })
    })

    it('handles addition in expressions', () => {
      expect(
        dataFromTemplate(
          {
            total: '{{event.data.sizeBytes + 1000}}',
          },
          {
            objects: {
              event: { data: { sizeBytes: 500000 } },
            },
          },
          { validate: true },
        ),
      ).resolves.toEqual({
        total: 501000,
      })
    })

    it('handles number comparisons with arithmetic', () => {
      expect(
        dataFromTemplate(
          {
            result:
              '{{event.data.sizeBytes * 2 > 1000000 ? "large" : "small"}}',
          },
          {
            objects: {
              event: { data: { sizeBytes: 600000 } },
            },
          },
          { validate: true },
        ),
      ).resolves.toEqual({
        result: 'large',
      })
    })
  })

  describe('boolean expressions', () => {
    it('handles boolean values in expressions', () => {
      expect(
        dataFromTemplate(
          {
            enabled: '{{event.data.isEnabled ? "yes" : "no"}}',
          },
          {
            objects: {
              event: { data: { isEnabled: true } },
            },
          },
          { validate: true },
        ),
      ).resolves.toEqual({
        enabled: 'yes',
      })
    })

    it('handles boolean comparisons', () => {
      expect(
        dataFromTemplate(
          {
            result:
              '{{event.data.isEnabled === true ? "enabled" : "disabled"}}',
          },
          {
            objects: {
              event: { data: { isEnabled: false } },
            },
          },
          { validate: true },
        ),
      ).resolves.toEqual({
        result: 'disabled',
      })
    })
  })

  describe('edge cases', () => {
    it('handles empty string expressions', () => {
      expect(
        dataFromTemplate(
          {
            value: '{{event.data.empty}}',
          },
          {
            objects: {
              event: { data: { empty: '' } },
            },
          },
          { validate: true },
        ),
      ).resolves.toEqual({
        value: '',
      })
    })

    it('handles whitespace in template expressions', () => {
      expect(
        dataFromTemplate(
          {
            value: '{{ event.data.folderId }}',
          },
          {
            objects: {
              event: { data: { folderId: 'folder-123' } },
            },
          },
          { validate: true },
        ),
      ).resolves.toEqual({
        value: 'folder-123',
      })
    })

    it('handles expressions that return objects', () => {
      expect(
        dataFromTemplate(
          {
            nested: '{{event.data.nested}}',
          },
          {
            objects: contextObjects,
          },
          { validate: true },
        ),
      ).resolves.toEqual({
        nested: { value: 'nested' },
      })
    })

    it('handles expressions that return numbers', () => {
      expect(
        dataFromTemplate(
          {
            size: '{{event.data.sizeBytes}}',
          },
          {
            objects: {
              event: { data: { sizeBytes: 12345 } },
            },
          },
          { validate: true },
        ),
      ).resolves.toEqual({
        size: 12345,
      })
    })

    it('handles complex mixed expressions', () => {
      expect(
        dataFromTemplate(
          {
            description:
              'File {{event.data.objectKey}} in folder {{event.data.folderId}} is {{event.data.sizeBytes > 1000000 ? "large" : "small"}}',
          },
          {
            objects: {
              event: {
                data: {
                  objectKey: 'file.txt',
                  folderId: 'folder-123',
                  sizeBytes: 2000000,
                },
              },
            },
          },
          { validate: true },
        ),
      ).resolves.toEqual({
        description: 'File file.txt in folder folder-123 is large',
      })
    })

    it('handles string methods in expressions', () => {
      expect(
        dataFromTemplate(
          {
            upper: '{{event.data.folderId.toUpperCase()}}',
          },
          {
            objects: {
              event: { data: { folderId: 'folder-123' } },
            },
          },
          { validate: true },
        ),
      ).resolves.toEqual({
        upper: 'FOLDER-123',
      })
    })

    it('handles string includes in expressions', () => {
      expect(
        dataFromTemplate(
          {
            result:
              "{{event.data.folderId.includes('folder') ? 'found' : 'not-found'}}",
          },
          {
            objects: {
              event: { data: { folderId: 'folder-123' } },
            },
          },
          { validate: true },
        ),
      ).resolves.toEqual({
        result: 'found',
      })
    })
  })

  describe('error handling', () => {
    it('handles invalid expressions gracefully when validate is false', () => {
      expect(
        dataFromTemplate(
          {
            value: '{{invalid.expression.here}}',
          },
          {
            objects: {
              event: { data: {} },
            },
          },
        ),
      ).resolves.toEqual({
        value: null,
      })
    })

    it('handles syntax errors in expressions gracefully', () => {
      expect(
        dataFromTemplate(
          {
            value: '{{event.data.folderId ===}}',
          },
          {
            objects: {
              event: { data: { folderId: 'test' } },
            },
          },
        ),
      ).resolves.toEqual({
        value: null,
      })
    })
  })

  describe('function calls with expressions', () => {
    it('handles function calls with expression arguments', () => {
      const formatPath = (
        folderId: JsonSerializableValue | undefined,
        objectKey: JsonSerializableValue | undefined,
      ): JsonSerializableValue => {
        if (typeof folderId !== 'string' || typeof objectKey !== 'string') {
          return null
        }
        return `${folderId}/${objectKey}`
      }

      expect(
        dataFromTemplate(
          {
            path: '{{formatPath(event.data.folderId, event.data.objectKey)}}',
          },
          {
            objects: contextObjects,
            functions: { formatPath },
          },
          { validate: true },
        ),
      ).resolves.toEqual({
        path: 'folder-123/file.txt',
      })
    })

    it('handles function calls with conditional expression arguments', () => {
      const getType = (mediaType: JsonSerializableValue | undefined) => {
        if (typeof mediaType !== 'string') {
          return 'unknown'
        }
        return mediaType === 'IMAGE' ? 'image' : 'video'
      }

      expect(
        dataFromTemplate(
          {
            type: "{{getType(event.data.mediaType === 'IMAGE' ? 'IMAGE' : 'VIDEO')}}",
          },
          {
            objects: {
              event: { data: { mediaType: 'IMAGE' } },
            },
            functions: { getType },
          },
          { validate: true },
        ),
      ).resolves.toEqual({
        type: 'image',
      })
    })
  })
})
