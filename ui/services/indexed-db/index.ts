import { IndexedDb } from './IndexedDb'

const isServer = typeof window === 'undefined'
export const indexedDb = !isServer ? new IndexedDb() : undefined
