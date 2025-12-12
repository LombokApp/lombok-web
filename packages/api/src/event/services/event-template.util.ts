import type {
  JsonSerializableObject,
  JsonSerializableValue,
} from '@lombokapp/types'
import { dataFromTemplate } from 'src/platform/utils/data-template.util'

import type { Event } from '../entities/event.entity'

export function parseDataFromEventWithTrigger(
  event: Event,
  triggerData: Record<string, JsonSerializableValue>,
): JsonSerializableObject {
  return dataFromTemplate({ event }, triggerData)
}
