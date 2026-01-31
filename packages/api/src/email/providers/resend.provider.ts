import { Resend } from 'resend'

import type { EmailProvider, SendEmailInput, SendEmailResult } from '../types'

export function createResendProvider(apiKey: string): EmailProvider {
  const resend = new Resend(apiKey)

  return {
    async send(input: SendEmailInput): Promise<SendEmailResult> {
      const to = Array.isArray(input.to) ? input.to : [input.to]
      const { data } = await resend.emails.send({
        from: input.from,
        to,
        subject: input.subject,
        text: input.text ?? '',
        html: input.html,
        replyTo: input.replyTo,
        cc: input.cc,
        bcc: input.bcc,
      })
      return { messageId: data?.id }
    },
  }
}
