import type { Collection, EntityMetadata, Reference } from '@mikro-orm/core'
import { Property, wrap } from '@mikro-orm/core'

export interface BaseEntityData {
  createdAt: Date
  updatedAt: Date
}

// This will not be necessary in MikroORM V5
// https://github.com/mikro-orm/mikro-orm/issues/1623
export type Serialized<T> = T extends Reference<infer U>
  ? Serialized<U>
  : T extends Collection<infer U>
  ? Serialized<U>[]
  : T extends (infer U)[]
  ? Serialized<U>[]
  : T extends { toObject: () => infer U }
  ? U
  : T extends () => infer U
  ? U
  : T

export class BaseEntity {
  toObject() {
    const entity = wrap(this)

    return entity.toObject() as unknown as {
      [K in keyof this]: Serialized<this[K]>
    }
  }

  toObjectOmit<T extends (keyof this)[] = []>(omit: T) {
    const entity = wrap(this)

    return entity.toObject(omit as string[]) as unknown as {
      [K in Exclude<keyof this, T[number]>]: Serialized<this[K]>
    }
  }

  toObjectPick<T extends (keyof this)[]>(pick: T) {
    const entity = wrap(this)
    const meta = (entity as any).__meta as EntityMetadata

    const keys = Object.keys(entity).concat(meta.props.map((p) => p.name))

    return entity.toObject(
      keys.filter((k) => !(pick as string[]).includes(k)),
    ) as unknown as {
      [K in T[number]]: Serialized<this[K]>
    }
  }
}

export class TimestampedEntity extends BaseEntity {
  @Property()
  readonly createdAt = new Date()

  @Property({ onUpdate: () => new Date() })
  updatedAt = new Date()
}
