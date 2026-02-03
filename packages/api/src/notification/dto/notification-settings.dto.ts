import { createZodDto } from '@anatine/zod-nestjs'
import { z } from 'zod'

export const notificationSettingDTO = z.object({
  eventIdentifier: z.string(),
  emitterIdentifier: z.string(),
  channel: z.enum(['web', 'email', 'mobile']),
  enabled: z.boolean(),
})

export class NotificationSettingDTO extends createZodDto(
  notificationSettingDTO,
) {}

export const notificationSettingsUpdateDTO = z.object({
  settings: z.array(notificationSettingDTO),
})

export class NotificationSettingsUpdateDTO extends createZodDto(
  notificationSettingsUpdateDTO,
) {}

export const notificationSettingsResponseDTO = z.object({
  settings: z.array(notificationSettingDTO),
})

export class NotificationSettingsResponseDTO extends createZodDto(
  notificationSettingsResponseDTO,
) {}
