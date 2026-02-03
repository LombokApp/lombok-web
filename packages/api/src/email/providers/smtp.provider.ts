import nodemailer from 'nodemailer'

import type { EmailProvider, SendEmailInput, SendEmailResult } from '../types'

export interface SmtpConfig {
  host: string
  port: number
  username: string
  password: string
}

export function createSmtpProvider(config: SmtpConfig): EmailProvider {
  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.port === 465,
    auth: {
      user: config.username,
      pass: config.password,
    },
  })

  return {
    async send(input: SendEmailInput): Promise<SendEmailResult> {
      const to = Array.isArray(input.to) ? input.to : [input.to]
      const cc = input.cc
        ? Array.isArray(input.cc)
          ? input.cc
          : [input.cc]
        : undefined
      const bcc = input.bcc
        ? Array.isArray(input.bcc)
          ? input.bcc
          : [input.bcc]
        : undefined
      const info = await transporter.sendMail({
        from: input.from,
        to,
        cc,
        bcc,
        subject: input.subject,
        text: input.text,
        html: input.html,
        replyTo: input.replyTo,
      })
      return { messageId: info.messageId }
    },
  }
}
