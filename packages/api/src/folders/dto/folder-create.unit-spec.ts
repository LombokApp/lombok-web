import { describe, expect, it } from 'bun:test'
import { storageLocationInputDTOSchema } from 'src/storage/dto/storage-location-input.dto'
import { v4 as uuidV4 } from 'uuid'

describe('StorageLocationInputDto object validation', () => {
  it('validates a custom location successfully', () => {
    const result = storageLocationInputDTOSchema.safeParse({
      endpoint: 'http://some_endpoint',
      accessKeyId: 'some_key',
      secretAccessKey: 'some_secret',
      bucket: 'some_bucket',
      region: 'some_region',
    })
    expect(result.success).toBe(true)
  })

  it('validates a storageProvisionId successfully', () => {
    const result = storageLocationInputDTOSchema.safeParse({
      storageProvisionId: uuidV4(),
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
