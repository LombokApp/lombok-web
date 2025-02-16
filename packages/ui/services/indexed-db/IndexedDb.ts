import type { IDBPDatabase } from 'idb'
import * as idb from 'idb'

import {
  LOCAL_DB_FILE_CACHE_METADATA_TABLE,
  LOCAL_DB_FILE_CACHE_TABLE,
  LOCAL_DB_NAME,
} from '../../utils/constants'

export interface FileContentDBSchema {
  id: IDBValidKey
  folderId: string
  objectKey: string
  dataURL: string
  type: string
}

export interface FileMetadataDBSchema {
  id: IDBValidKey
  folderId: string
  objectKey: string
  size: number
  type: string
}

export interface DBSchemas {
  fileContent: FileContentDBSchema
  fileMetadata: FileMetadataDBSchema
}

export class IndexedDb {
  private readonly database: string
  private db: IDBPDatabase<DBSchemas> | undefined
  public initialized = false

  constructor() {
    this.database = LOCAL_DB_NAME
    void this.initDb()
  }
  private initPromise?: Promise<IDBPDatabase<DBSchemas>>

  private async initDb() {
    try {
      if (!this.initPromise) {
        this.initialized = true
        this.initPromise = idb
          .openDB<DBSchemas>(this.database, 1, {
            upgrade: (db) => {
              const metadataTableExists = db.objectStoreNames.contains(
                LOCAL_DB_FILE_CACHE_METADATA_TABLE,
              )
              const fileCacheTableExists = db.objectStoreNames.contains(
                LOCAL_DB_FILE_CACHE_TABLE,
              )
              if (!fileCacheTableExists) {
                db.createObjectStore(LOCAL_DB_FILE_CACHE_TABLE, {
                  keyPath: 'id',
                })
              }
              if (!metadataTableExists) {
                db.createObjectStore(LOCAL_DB_FILE_CACHE_METADATA_TABLE, {
                  keyPath: 'id',
                })
              }
              return db
            },
          })
          .then((db) => {
            this.db = db
            return db
          })
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('createObjectStores ERROR:', error)
      throw error
    }
    return this.initPromise
  }

  public async getMetadata(id: string) {
    if (this.db) {
      const tx = this.db.transaction(
        LOCAL_DB_FILE_CACHE_METADATA_TABLE,
        'readonly',
      )
      const store = tx.objectStore(LOCAL_DB_FILE_CACHE_METADATA_TABLE)
      const result = (await store.get(id)) as FileMetadataDBSchema
      return { result, err: undefined }
    }
    return { result: undefined, err: new Error('No DB is loaded') }
  }

  public async listMetadata() {
    if (this.db) {
      const tx = this.db.transaction(
        LOCAL_DB_FILE_CACHE_METADATA_TABLE,
        'readonly',
      )
      const store = tx.objectStore(LOCAL_DB_FILE_CACHE_METADATA_TABLE)
      const result = (await store.getAll()) as FileMetadataDBSchema[]
      return { result, err: undefined }
    }
    return { result: undefined, err: new Error('No DB is loaded') }
  }

  public async purgeStorageForFolderId(folderId: string) {
    if (this.db) {
      const tx = this.db.transaction(
        LOCAL_DB_FILE_CACHE_METADATA_TABLE,
        'readonly',
      )
      const store = tx.objectStore(LOCAL_DB_FILE_CACHE_METADATA_TABLE)
      const result = (await store.getAll()) as FileMetadataDBSchema[]
      let deletedCount = 0
      await Promise.all(
        result.map(async (row) => {
          if (row.folderId === folderId) {
            deletedCount += 1
            await this.delete(folderId, row.objectKey)
          }
        }, {}),
      )
      return { result: { deletedCount }, err: undefined }
    }
    return { result: undefined, err: new Error('No DB is loaded') }
  }

  public async measureFolderSizes() {
    await this.initDb()
    if (this.db) {
      const tx = this.db.transaction(
        LOCAL_DB_FILE_CACHE_METADATA_TABLE,
        'readonly',
      )
      const store = tx.objectStore(LOCAL_DB_FILE_CACHE_METADATA_TABLE)
      const result = (await store.getAll()) as FileMetadataDBSchema[]
      const folderSizes = result.reduce<Record<string, number>>(
        (acc, row) => ({
          ...acc,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
          [row.folderId]: (acc as any)[row.folderId] ?? 0 + row.size,
        }),
        {},
      )
      return folderSizes
    }
    throw new Error('No db.')
  }

  public async putData(
    folderId: string,
    key: string,
    value: { dataURL: string; type: string },
  ) {
    await this.initDb()
    await this.db
      ?.transaction(LOCAL_DB_FILE_CACHE_TABLE, 'readwrite')
      .objectStore(LOCAL_DB_FILE_CACHE_TABLE)
      .put({
        id: `${folderId}:${key}`,
        folderId,
        objectKey: key,
        ...value,
      })

    await this.db
      ?.transaction(LOCAL_DB_FILE_CACHE_METADATA_TABLE, 'readwrite')
      .objectStore(LOCAL_DB_FILE_CACHE_METADATA_TABLE)
      .put({
        id: `${folderId}:${key}`,
        folderId,
        objectKey: key,
        size: value.dataURL.length,
        type: value.type,
      })
    return { result: undefined, err: new Error('No DB is loaded') }
  }

  public async getData(
    folderId: string,
    objectKey: string,
  ): Promise<FileContentDBSchema | undefined> {
    await this.initDb()
    const result = (await this.db
      ?.transaction(LOCAL_DB_FILE_CACHE_TABLE, 'readwrite')
      .objectStore(LOCAL_DB_FILE_CACHE_TABLE)
      .get(`${folderId}:${objectKey}`)) as FileContentDBSchema | undefined

    return result
  }

  public async delete(folderId: string, key: string) {
    await this.initDb()
    await this.db
      ?.transaction(LOCAL_DB_FILE_CACHE_TABLE, 'readwrite')
      .objectStore(LOCAL_DB_FILE_CACHE_TABLE)
      .delete(`${folderId}:${key}`)

    await this.db
      ?.transaction(LOCAL_DB_FILE_CACHE_METADATA_TABLE, 'readwrite')
      .objectStore(LOCAL_DB_FILE_CACHE_METADATA_TABLE)
      .delete(`${folderId}:${key}`)
  }
}
