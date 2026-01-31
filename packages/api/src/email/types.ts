/**
 * Input shape for EmailService.sendEmail().
 * At least one of `text` or `html` is required.
 */
export interface SendEmailInput {
  to: string | string[]
  from: string
  subject: string
  text?: string
  html?: string
  replyTo?: string
  cc?: string | string[]
  bcc?: string | string[]
}

export interface SendEmailResult {
  messageId?: string
}

export interface EmailProvider {
  send: (input: SendEmailInput) => Promise<SendEmailResult>
}
