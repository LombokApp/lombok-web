import { forwardRef, Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { coreConfig } from 'src/core/config'
import { EmailModule } from 'src/email/email.module'
import { FoldersModule } from 'src/folders/folders.module'
import { LogModule } from 'src/log/log.module'
import { ServerModule } from 'src/server/server.module'
import { SocketModule } from 'src/socket/socket.module'
import { TaskModule } from 'src/task/task.module'

import { NotificationSettingsController } from './controllers/notification-settings.controller'
import { NotificationsController } from './controllers/notifications.controller'
import { CreateEventNotificationsProcessor } from './processors/create-event-notifications.processor'
import { NotificationDeliveriesProcessor } from './processors/notification-deliveries.processor'
import { SendNotificationEmailsProcessor } from './processors/send-notification-emails.processor'
import { NotificationService } from './services/notification.service'
import { NotificationBatchingService } from './services/notification-batching.service'
import { NotificationDeliveryService } from './services/notification-delivery.service'
import { NotificationQueryService } from './services/notification-query.service'
import { NotificationRecipientService } from './services/notification-recipient.service'
import { NotificationSettingsService } from './services/notification-settings.service'
import { NotificationTaskQueueService } from './services/notification-task-queue.service'

@Module({
  imports: [
    forwardRef(() => FoldersModule),
    forwardRef(() => SocketModule),
    forwardRef(() => TaskModule),
    forwardRef(() => EmailModule),
    forwardRef(() => ServerModule),
    forwardRef(() => LogModule),
    ConfigModule.forFeature(coreConfig),
  ],
  controllers: [NotificationSettingsController, NotificationsController],
  providers: [
    // Services
    NotificationService,
    NotificationBatchingService,
    NotificationDeliveryService,
    NotificationQueryService,
    NotificationRecipientService,
    NotificationSettingsService,
    NotificationTaskQueueService,
    // Processors
    CreateEventNotificationsProcessor,
    NotificationDeliveriesProcessor,
    SendNotificationEmailsProcessor,
  ],
  exports: [NotificationTaskQueueService, NotificationSettingsService],
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class NotificationModule {}
