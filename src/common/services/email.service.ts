import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';

import nodemailer, { Transporter } from 'nodemailer';
import type { MailOptions } from 'nodemailer/lib/json-transport';
import { emailTemplate, otpEnum, type EmailTemplate } from 'src/common';

@Injectable()
export class EmailService {
  transporter: Transporter;
  constructor(
    private configService: ConfigService,
    private emailEvent: EventEmitter2,
  ) {
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: this.configService.get<string>('GOOGLE_EMAIL'),
        pass: this.configService.get<string>('GOOGLE_PASSWORD'),
      },
    });
  }

  async sendEmail({
    from,
    to,
    cc,
    bcc,
    subject,
    text,
    html,
    attachments,
  }: MailOptions): Promise<void> {
    await this.transporter.sendMail({
      from: `Edu Learn ${this.configService.get<string>('GOOGLE_EMAIL')}`,
      to,
      cc,
      bcc,
      subject,
      text,
      html,
      attachments,
    });
  }

  @OnEvent(otpEnum.confirmEmail, { async: true })
  async confirmEmail(
    emailData: MailOptions,
    templateData: EmailTemplate,
  ): Promise<void> {
    //console.log('email is being sent', emailData, templateData);
    
    await this.sendEmail({
      from: emailData.from,
      to: emailData.to,
      subject: emailData.subject,
      html: emailTemplate({ title: templateData.title, otp: templateData.otp }),
    }).catch((error) => {
      console.log('error sending email', error);
    });
  }

  @OnEvent(otpEnum.forgotpassword, { async: true })
  async forgotpassword(
    emailData: MailOptions,
    templateData: EmailTemplate,
  ): Promise<void> {
    await this.sendEmail({
      from: emailData.from,
      to: emailData.to,
      subject: emailData.subject,
      html: emailTemplate({ title: templateData.title, otp: templateData.otp }),
    }).catch((error) => {
      console.log('error sending email', error);
    });
  }
}
