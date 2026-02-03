import { Injectable, Logger } from '@nestjs/common'
import { EMAIL_PROVIDER_CONFIG } from 'src/server/constants/server.constants'
import { ServerConfigurationService } from 'src/server/services/server-configuration.service'

import { EmailNotConfiguredException } from './exceptions/email-not-configured.exception'
import { EmailSendFailedException } from './exceptions/email-send-failed.exception'
import { createResendProvider } from './providers/resend.provider'
import { createSmtpProvider } from './providers/smtp.provider'
import type { EmailProvider, SendEmailInput, SendEmailResult } from './types'

function extractDomains(addresses: string | string[]): string[] {
  const list = Array.isArray(addresses) ? addresses : [addresses]
  return list
    .map((a) => {
      const match = a.match(/@([^\s]+)/)
      return match ? match[1] : null
    })
    .filter((d): d is string => d !== null)
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name)
  private readonly providerCache = new Map<string, EmailProvider>()

  constructor(
    private readonly serverConfigurationService: ServerConfigurationService,
  ) {}

  private async getProvider() {
    const config = await this.serverConfigurationService.getServerConfig(
      EMAIL_PROVIDER_CONFIG,
    )
    if (!config) {
      throw new EmailNotConfiguredException()
    }
    const cacheKey = JSON.stringify(config)
    let provider = this.providerCache.get(cacheKey)
    if (!provider) {
      if (config.provider === 'resend') {
        provider = createResendProvider(config.config.apiKey)
      } else {
        provider = createSmtpProvider(config.config)
      }
      this.providerCache.set(cacheKey, provider)
    }
    return { provider, providerName: config.provider }
  }

  async sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
    if (!input.text && !input.html) {
      throw new EmailSendFailedException(
        'At least one of text or html is required',
      )
    }
    const { provider, providerName } = await this.getProvider()
    const domains = extractDomains(input.to)
    try {
      const result = await provider.send(input)
      this.logger.log({
        provider: providerName,
        recipientDomains: domains,
        subjectLength: input.subject.length,
        messageId: result.messageId,
      })
      return result
    } catch (err) {
      this.logger.warn({
        provider: providerName,
        recipientDomains: domains,
        subjectLength: input.subject.length,
        error: err instanceof Error ? err.message : String(err),
      })
      throw new EmailSendFailedException(
        err instanceof Error ? err.message : 'Email send failed',
      )
    }
  }
}
