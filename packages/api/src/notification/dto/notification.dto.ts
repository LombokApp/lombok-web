import { createZodDto } from '@anatine/zod-nestjs'
import { z } from 'zod'

export const notificationDTO = z.object({
  id: z.string().uuid(),
  eventIdentifier: z.string(),
  emitterIdentifier: z.string(),
  aggregationKey: z.string(),
  targetLocationFolderId: z.string().uuid().nullable(),
  targetLocationObjectKey: z.string().nullable(),
  targetUserId: z.string().uuid().nullable(),
  eventIds: z.array(z.string().uuid()),
  title: z.string(),
  body: z.string().nullable(),
  image: z.string().nullable(),
  path: z.string().nullable(),
  createdAt: z.string().datetime(),
  readAt: z.string().datetime().nullable(),
})

export class NotificationDTO extends createZodDto(notificationDTO) {}

export const notificationListQueryDTO = z.object({
  cursor: z.string().optional(),
  limit: z
    .preprocess(
      (a) => parseInt(a as string, 10),
      z.number().refine((a) => a > 0),
    )
    .optional(),
  sort: z.enum(['createdAt-asc', 'createdAt-desc']).optional(),
  read: z.boolean().optional(),
  eventIdentifier: z.string().optional(),
  emitterIdentifier: z.string().optional(),
})

export class NotificationListQueryDTO extends createZodDto(
  notificationListQueryDTO,
) {}

export const notificationListResponseDTO = z.object({
  notifications: z.array(notificationDTO),
  nextCursor: z.string().optional(),
})

export class NotificationListResponseDTO extends createZodDto(
  notificationListResponseDTO,
) {}

export const notificationUnreadCountResponseDTO = z.object({
  count: z.number().int().min(0),
})

export class NotificationUnreadCountResponseDTO extends createZodDto(
  notificationUnreadCountResponseDTO,
) {}
