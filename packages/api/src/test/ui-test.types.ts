import type { buildUITestModule } from './ui-test.util'

export type UITestModule = Awaited<ReturnType<typeof buildUITestModule>>
