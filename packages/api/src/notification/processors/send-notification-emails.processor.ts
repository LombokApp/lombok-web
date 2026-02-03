import { CORE_IDENTIFIER, LogEntryLevel } from '@lombokapp/types'
import { Inject, Injectable } from '@nestjs/common'
import nestjsConfig from '@nestjs/config'
import { eq, inArray } from 'drizzle-orm'
import { coreConfig } from 'src/core/config'
import { buildPlatformOrigin } from 'src/core/utils/platform-origin.util'
import { EmailService } from 'src/email/email.service'
import { EmailNotConfiguredException } from 'src/email/exceptions/email-not-configured.exception'
import { LogEntryService } from 'src/log/services/log-entry.service'
import { OrmService } from 'src/orm/orm.service'
import { EMAIL_PROVIDER_CONFIG } from 'src/server/constants/server.constants'
import { ServerConfigurationService } from 'src/server/services/server-configuration.service'
import { getUtcTimestampBucket } from 'src/shared/utils/timestamp.util'
import { BaseCoreTaskProcessor } from 'src/task/base.processor'
import { type NewTask, tasksTable } from 'src/task/entities/task.entity'
import { CoreTaskName } from 'src/task/task.constants'
import { withTaskIdempotencyKey } from 'src/task/util/task-idempotency-key.util'
import { usersTable } from 'src/users/entities/user.entity'

import { notificationsTable } from '../entities/notification.entity'
import { notificationDeliveriesTable } from '../entities/notification-delivery.entity'

@Injectable()
export class SendNotificationEmailsProcessor extends BaseCoreTaskProcessor<CoreTaskName.SendNotificationEmails> {
  constructor(
    private readonly emailService: EmailService,
    private readonly logEntryService: LogEntryService,
    private readonly ormService: OrmService,
    private readonly serverConfigurationService: ServerConfigurationService,
    @Inject(coreConfig.KEY)
    private readonly coreConfigValues: nestjsConfig.ConfigType<
      typeof coreConfig
    >,
  ) {
    super(CoreTaskName.SendNotificationEmails, async (task) => {
      const { bucketIndex } = task.data

      // Check if email is configured
      const emailConfig = await this.serverConfigurationService.getServerConfig(
        EMAIL_PROVIDER_CONFIG,
      )
      if (!emailConfig) {
        this.logger.verbose(
          { bucketIndex },
          'Email not configured, skipping email notifications',
        )
        return
      }

      const from = emailConfig.from
      const platformOrigin = buildPlatformOrigin(this.coreConfigValues)

      // Query for all pending email deliveries
      const pendingDeliveries = await this.ormService.db
        .select({
          delivery: notificationDeliveriesTable,
          notification: notificationsTable,
          user: usersTable,
        })
        .from(notificationDeliveriesTable)
        .innerJoin(
          notificationsTable,
          eq(notificationDeliveriesTable.notificationId, notificationsTable.id),
        )
        .innerJoin(
          usersTable,
          eq(notificationDeliveriesTable.userId, usersTable.id),
        )
        .where(eq(notificationDeliveriesTable.emailStatus, 'pending'))
        .limit(100) // Process in batches of 100

      if (pendingDeliveries.length === 0) {
        this.logger.verbose(
          { bucketIndex },
          'No pending email deliveries found',
        )
        return
      }

      this.logger.log(
        { bucketIndex, count: pendingDeliveries.length },
        'Processing pending email notifications',
      )

      // Process each delivery
      const deliveryIds: string[] = []
      const failedDeliveryIds: string[] = []

      for (const { delivery, notification, user } of pendingDeliveries) {
        if (!user.email) {
          this.logger.warn(
            { userId: user.id, deliveryId: delivery.id },
            'User has no email address',
          )
          failedDeliveryIds.push(delivery.id)
          continue
        }

        try {
          // Build email content
          const subject = notification.title
          const notificationUrl = notification.path
            ? `${platformOrigin}${notification.path}`
            : `${platformOrigin}/notifications`

          const textContent = this.buildTextEmail(
            notification.title,
            notification.body,
            notificationUrl,
          )
          const htmlContent = this.buildHtmlEmail(
            notification.title,
            notification.body,
            notificationUrl,
          )

          // Send email
          await this.emailService.sendEmail({
            to: user.email,
            from,
            subject,
            text: textContent,
            html: htmlContent,
          })

          deliveryIds.push(delivery.id)
          this.logger.verbose(
            {
              deliveryId: delivery.id,
              userId: user.id,
              notificationId: notification.id,
            },
            'Sent notification email',
          )
        } catch (error) {
          if (error instanceof EmailNotConfiguredException) {
            this.logger.warn('Email service not configured, stopping batch')

            await this.logEntryService.emitLog({
              level: LogEntryLevel.ERROR,
              emitterIdentifier: CORE_IDENTIFIER,
              logMessage:
                'Failed to send notification email batch because email provider is not configured',
              data: {
                deliveryId: delivery.id,
                userId: user.id,
                notificationId: notification.id,
              },
            })
            break
          }

          failedDeliveryIds.push(delivery.id)
        }
      }

      // Update successful deliveries
      if (deliveryIds.length > 0) {
        await this.ormService.db
          .update(notificationDeliveriesTable)
          .set({
            emailStatus: 'sent',
            emailSentAt: new Date(),
          })
          .where(inArray(notificationDeliveriesTable.id, deliveryIds))
      }

      // Update failed deliveries
      if (failedDeliveryIds.length > 0) {
        await this.ormService.db
          .update(notificationDeliveriesTable)
          .set({
            emailStatus: 'failed',
            emailFailedAt: new Date(),
            emailError: {
              code: 'EMAIL_SEND_FAILED',
              message: 'Failed to send notification email',
            },
          })
          .where(inArray(notificationDeliveriesTable.id, failedDeliveryIds))
      }

      // If there might be more pending deliveries, queue another task
      if (pendingDeliveries.length === 100) {
        const now = new Date()
        const delayMs = 1000 // 1 second delay
        const dontStartBefore = new Date(now.getTime() + delayMs)
        const timestampBucket = getUtcTimestampBucket(
          delayMs / 1000,
          'seconds',
          dontStartBefore,
        )

        const nextTask: NewTask = withTaskIdempotencyKey({
          id: crypto.randomUUID(),
          ownerIdentifier: CORE_IDENTIFIER,
          taskIdentifier: CoreTaskName.SendNotificationEmails,
          invocation: {
            kind: 'system_action',
            invokeContext: {
              idempotencyData: {
                bucketIndex: timestampBucket.bucketIndex,
              },
            },
          },
          taskDescription: 'Send batched notification emails',
          data: { bucketIndex: timestampBucket.bucketIndex },
          dontStartBefore,
          createdAt: now,
          updatedAt: now,
          handlerType: 'core',
        })

        await this.ormService.db.insert(tasksTable).values(nextTask)
        this.logger.log('Queued next batch of notification emails')
      }
    })
  }

  private buildTextEmail(
    title: string,
    body: string | null,
    url: string,
  ): string {
    let content = `${title}\n\n`
    if (body) {
      content += `${body}\n\n`
    }
    content += `View notification: ${url}\n`
    return content
  }

  private buildHtmlEmail(
    title: string,
    body: string | null,
    url: string,
  ): string {
    const bodyHtml = body
      ? `<p style="color: #666; margin-bottom: 20px;">${this.escapeHtml(body)}</p>`
      : ''

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #f8f9fa; border-radius: 8px; padding: 30px; margin-bottom: 20px;">
    <h1 style="margin: 0 0 15px 0; font-size: 24px; color: #1a1a1a;">${this.escapeHtml(title)}</h1>
    ${bodyHtml}
    <a href="${this.escapeHtml(url)}" style="display: inline-block; background-color: #007bff; color: white; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 500; margin-top: 10px;">View Notification</a>
  </div>
  <p style="color: #999; font-size: 12px; text-align: center;">
    You received this email because you have email notifications enabled for this event type.
  </p>
</body>
</html>`
  }

  private escapeHtml(text: string): string {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    }
    return text.replace(/[&<>"']/g, (m) => map[m] ?? m)
  }
}
