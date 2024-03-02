import sendgrid from '@sendgrid/mail'
import { singleton } from 'tsyringe'

@singleton()
export class SendgridService {
  async sendEmail({
    fromEmail,
    toEmail,
    subject,
    textContent,
    htmlContent,
  }: {
    fromEmail: string
    toEmail: string
    subject: string
    textContent: string
    htmlContent?: string
  }) {
    await sendgrid.send({
      from: fromEmail,
      to: toEmail,
      subject,
      text: textContent,
      html: htmlContent,
    })
  }
}
