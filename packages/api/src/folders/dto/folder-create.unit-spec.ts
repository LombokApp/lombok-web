import { describe, expect, it } from 'bun:test'
import crypto from 'crypto'
import { storageLocationInputDTOSchema } from 'src/storage/dto/storage-location-input.dto'

describe('StorageLocationInputDto object validation', () => {
  it('validates a custom location successfully', () => {
    const result = storageLocationInputDTOSchema.safeParse({
      endpoint: 'http://some_endpoint',
      accessKeyId: 'some_key',
      secretAccessKey: 'some_secret',
      bucket: 'some_bucket',
      region: 'some_region',
      prefix: null,
    })
    expect(result.success).toBe(true)
  })

  it('validates a storageProvisionId successfully', () => {
    const result = storageLocationInputDTOSchema.safeParse({
      storageProvisionId: crypto.randomUUID(),
    })
    expect(result.success).toBe(true)
  })

  it('should not be successful', () => {
    const poopResult = storageLocationInputDTOSchema.safeParse({
      poop: 'asdfsadsdaf',
    })
    expect(poopResult.success).toBe(false)
  })
})
