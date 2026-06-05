import { BUILTIN_ICON_NAMES } from '@lombokapp/types'
import { describe, expect, it } from 'bun:test'

import { BUILTIN_ICON_CATALOG } from './builtin-catalog'

describe('BUILTIN_ICON_CATALOG', () => {
  it('covers every name in BUILTIN_ICON_NAMES at runtime', () => {
    // TS already enforces this at compile time via the Record<BuiltinIconName,…>
    // type, but a runtime guard catches the (improbable) case where the
    // catalog is mutated after construction.
    const catalogKeys = Object.keys(BUILTIN_ICON_CATALOG).sort()
    const expectedKeys = [...BUILTIN_ICON_NAMES].sort()
    expect(catalogKeys).toEqual(expectedKeys)
  })
})
