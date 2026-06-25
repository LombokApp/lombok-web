import { describe, expect, it } from 'bun:test'
import crypto from 'crypto'
import { storageTargetInputDTOSchema } from 'src/storage/dto/storage-target-input.dto'

describe('StorageTargetInputDto object validation', () => {
  it('validates the builtin target successfully', () => {
    const result = storageTargetInputDTOSchema.safeParse({
      builtin: true,
    })
    expect(result.success).toBe(true)
  })

  it('validates a custom location successfully', () => {
    const result = storageTargetInputDTOSchema.safeParse({
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
    const result = storageTargetInputDTOSchema.safeParse({
      storageProvisionId: crypto.randomUUID(),
    })
    expect(result.success).toBe(true)
  })

  it('should not be successful', () => {
    const result = storageTargetInputDTOSchema.safeParse({
      poop: 'asdfsadsdaf',
    })
    expect(result.success).toBe(false)
  })
})
