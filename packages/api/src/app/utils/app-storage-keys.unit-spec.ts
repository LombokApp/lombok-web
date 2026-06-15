import { describe, expect, it } from 'bun:test'

import {
  buildAppStorageObjectKey,
  buildAppStoragePartitionPrefix,
} from './app-storage-keys'

describe('buildAppStoragePartitionPrefix', () => {
  it('uses the shared/ partition when no userId is given', () => {
    expect(
      buildAppStoragePartitionPrefix({
        serverPrefix: 'base',
        appIdentifier: 'notes',
      }),
    ).toBe('base/app-runtime-storage/notes/shared/')
  })

  it('uses the users/{userId}/ partition when a userId is given', () => {
    expect(
      buildAppStoragePartitionPrefix({
        serverPrefix: 'base',
        appIdentifier: 'notes',
        userId: 'u1',
      }),
    ).toBe('base/app-runtime-storage/notes/users/u1/')
  })

  it('handles a null server prefix', () => {
    expect(
      buildAppStoragePartitionPrefix({
        serverPrefix: null,
        appIdentifier: 'notes',
      }),
    ).toBe('app-runtime-storage/notes/shared/')
  })

  it('does not double the slash for a trailing-slash server prefix', () => {
    expect(
      buildAppStoragePartitionPrefix({
        serverPrefix: 'base/',
        appIdentifier: 'notes',
        userId: 'u1',
      }),
    ).toBe('base/app-runtime-storage/notes/users/u1/')
  })
})

describe('buildAppStorageObjectKey', () => {
  it('appends the object key under the shared partition', () => {
    expect(
      buildAppStorageObjectKey({
        serverPrefix: 'base',
        appIdentifier: 'notes',
        objectKey: 'a/b.json',
      }),
    ).toBe('base/app-runtime-storage/notes/shared/a/b.json')
  })

  it('appends the object key under the user partition', () => {
    expect(
      buildAppStorageObjectKey({
        serverPrefix: 'base',
        appIdentifier: 'notes',
        userId: 'u1',
        objectKey: 'a/b.json',
      }),
    ).toBe('base/app-runtime-storage/notes/users/u1/a/b.json')
  })

  it('collapses a leading slash on the object key', () => {
    expect(
      buildAppStorageObjectKey({
        serverPrefix: 'base',
        appIdentifier: 'notes',
        objectKey: '/a/b.json',
      }),
    ).toBe('base/app-runtime-storage/notes/shared/a/b.json')
  })
})
