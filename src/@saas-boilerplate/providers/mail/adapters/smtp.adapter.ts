import nodemailer from 'nodemailer'

import { MailProvider } from '../mail.provider'
import { type MailProviderOptions } from '../interfaces/provider.interface'

export const smtpAdapter = MailProvider.adapter(
  (options: MailProviderOptions) => {
    // Create a fresh transporter for each request to avoid connection issues

    const createTransporter = () => {
      // Check if we have individual SMTP config variables (preferred)
      const smtpHost = process.env.SMTP_HOST
      const smtpPort = process.env.SMTP_PORT
      const smtpUsername = process.env.SMTP_USERNAME
      const smtpPassword = process.env.SMTP_PASSWORD
      const smtpAuthDisabled = process.env.SMTP_AUTH_DISABLED === 'true'

      // If we have individual SMTP config, use it
      if (smtpHost && smtpPort) {
        const transporterConfig: any = {
          host: smtpHost,
          port: parseInt(smtpPort, 10),
          secure: smtpPort === '465', // true for 465, false for other ports
          tls: {
            // Disable certificate validation for development
            rejectUnauthorized: process.env.NODE_ENV === 'production',
          },
          connectionTimeout: 15000,
          greetingTimeout: 10000,
          socketTimeout: 15000,
        }

        // Add auth if credentials are provided (Zoho requires auth)
        // Only skip auth if explicitly disabled AND no credentials provided
        if (smtpUsername && smtpPassword && !smtpAuthDisabled) {
          transporterConfig.auth = {
            user: smtpUsername,
            pass: smtpPassword,
          }
        } else if (smtpAuthDisabled && (!smtpUsername || !smtpPassword)) {
          // Only allow no-auth if explicitly disabled and no credentials
          console.warn('[SMTP] Authentication disabled - ensure your SMTP server allows unauthenticated connections')
        } else if (smtpUsername && smtpPassword) {
          // If credentials exist, use them even if auth was supposedly disabled
          // This fixes the case where SMTP_AUTH_DISABLED="true" but credentials are provided
          transporterConfig.auth = {
            user: smtpUsername,
            pass: smtpPassword,
          }
        }

        return nodemailer.createTransport(transporterConfig)
      }

      // Fallback to SMTP URL if no individual config is provided
      const smtpUrl = options.secret

      return nodemailer.createTransport(smtpUrl, {
        // Disable certificate validation for local development
        tls: {
          rejectUnauthorized: process.env.NODE_ENV === 'production',
        },
        // Connection settings
        connectionTimeout: 10000,
        greetingTimeout: 5000,
        socketTimeout: 10000,
      })
    }

    return {
      send: async ({ to, subject, html, text }) => {
        const transport = createTransporter()

        // Set up email data
        const mailOptions = {
          from: options.from,
          to,
          subject,
          html,
          text,
        }

        try {
          const info = await transport.sendMail(mailOptions)
          if (process.env.NODE_ENV === 'development') {
            console.log('✅ [SMTP] Email sent successfully:', info.messageId)
            console.log('✅ [SMTP] Response:', info.response)
          }
          // Verify the connection before closing
          transport.close()
          return info
        } catch (error) {
          console.error('❌ [SMTP] Error sending email:', error)
          if (error instanceof Error) {
            console.error('❌ [SMTP] Error details:', {
              message: error.message,
              code: (error as any).code,
              command: (error as any).command,
            })
          }
          // Close the connection on error too
          transport.close()
          throw error
        }
      },
    }
  },
)
