import type { EntityDTO, EntityMetadata } from '@mikro-orm/core'
import { Property, wrap } from '@mikro-orm/core'

export interface BaseEntityData {
  createdAt: Date
  updatedAt: Date
}

export class BaseEntity<TClass> {
  toObject() {
    const entity = wrap(this)
    return entity.toObject() as unknown as EntityDTO<TClass>
  }

  toObjectOmit<T extends (keyof TClass)[] = []>(omit: T) {
    const entity = wrap(this)

    return entity.toObject(omit as string[]) as unknown as {
      [K in Exclude<keyof EntityDTO<TClass>, T[number]>]: EntityDTO<TClass>[K]
    }
  }

  toObjectPick<T extends (keyof EntityDTO<TClass>)[]>(pick: T) {
    const entity = wrap(this as unknown as TClass)
    const meta = (entity as any).__meta as EntityMetadata

    const keys = Object.keys(entity).concat(meta.props.map((p) => p.name))

    return entity.toObject(
      keys.filter((k) => !(pick as string[]).includes(k)),
    ) as unknown as {
      [K in T[number]]: EntityDTO<TClass>[K]
    }
  }
}

export class TimestampedEntity<Child> extends BaseEntity<Child> {
  @Property({ columnType: 'timestamptz(3)' })
  readonly createdAt = new Date()

  @Property({ columnType: 'timestamptz(3)', onUpdate: () => new Date() })
  updatedAt = new Date()
}
