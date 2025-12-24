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
})
