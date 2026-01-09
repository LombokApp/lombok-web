import type {
  JsonSerializableObject,
  JsonSerializableValue,
} from '@lombokapp/types'
import { dataFromTemplate } from 'src/core/utils/data-template.util'

import type { Event } from '../entities/event.entity'

export async function parseDataFromEventWithTrigger(
  dataTemplate: Record<string, JsonSerializableValue>,
  event: Event,
  functions: Record<
    string,
    (
      ...args: (JsonSerializableValue | undefined)[]
    ) => JsonSerializableValue | Promise<JsonSerializableValue>
  > = {},
): Promise<JsonSerializableObject> {
  return dataFromTemplate(dataTemplate, { objects: { event }, functions })
}
