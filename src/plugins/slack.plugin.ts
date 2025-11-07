import { PluginManager } from '@/@saas-boilerplate/providers/plugin-manager/provider'
import { z } from 'zod'
import { Url } from '@/@saas-boilerplate/utils/url'

export const slack = PluginManager.plugin({
  slug: 'slack',
  name: 'Slack',
  schema: z.object({
    webhook: z
      .string()
      .describe(
        'Your Slack webhook URL (get it from Slack app settings)',
      ),
  }),
  metadata: {
    verified: true,
    published: true,
    logo: 'https://a.slack-edge.com/80588/img/icons/app-256.png',
    description:
      'Integrate Slack to centralize your notifications, streamline team communication, and automate alerts directly into your workspace channels.',
    category: 'notifications',
    developer: 'Slack',
    screenshots: [],
    website: 'https://slack.com/',
    links: {
      install: 'https://slack.com/',
      guide: 'https://api.slack.com/start',
    },
  },
  actions: {
    sendEvent: {
      name: 'Send Event',
      schema: z.object({
        event: z.string(),
        data: z.any(),
      }),
      handler: async ({ config, input }) => {
        const { webhook } = config
        const { event, data } = input

        let slackPayload: any

        if (event === 'lead.created') {
          const leadUrl = Url.get(`/app/leads/${data.id}`)
          slackPayload = {
            blocks: [
              {
                type: 'section',
                text: {
                  type: 'mrkdwn',
                  text: `*New Lead Created!* 🚀\n<${leadUrl}|View Lead>`,
                },
              },
              {
                type: 'divider',
              },
              {
                type: 'section',
                fields: [
                  {
                    type: 'mrkdwn',
                    text: `*Name:*\n${data.name || 'N/A'}`,
                  },
                  {
                    type: 'mrkdwn',
                    text: `*Email:*\n${data.email}`,
                  },
                ],
              },
              {
                type: 'context',
                elements: [
                  {
                    type: 'mrkdwn',
                    text: `SaaS Boilerplate | Event: *${event}* | ${new Date().toISOString()}`,
                  },
                ],
              },
            ],
          }
        } else if (event === 'submission.created') {
          const leadUrl = Url.get(`/app/leads/${data.lead.id}`)
          const submissionData = data.metadata?.data || {}
          const fields = Object.entries(submissionData)
            .map(
              ([key, value]) =>
                `*${key.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}:*\n${value}`,
            )
            .join('\n\n')

          slackPayload = {
            blocks: [
              {
                type: 'section',
                text: {
                  type: 'mrkdwn',
                  text: `*New Submission Received!* 📝\n\n*From:* ${data.lead.name || data.lead.email}\n*Source:* ${data.metadata?.source || 'N/A'}`,
                },
              },
              {
                type: 'divider',
              },
              {
                type: 'section',
                text: {
                  type: 'mrkdwn',
                  text: fields,
                },
              },
              {
                type: 'divider',
              },
              {
                type: 'section',
                text: {
                  type: 'mrkdwn',
                  text: `<${leadUrl}|View Lead Details>`,
                },
              },
              {
                type: 'context',
                elements: [
                  {
                    type: 'mrkdwn',
                    text: `SaaS Boilerplate | Event: *${event}* | ${new Date().toISOString()}`,
                  },
                ],
              },
            ],
          }
        }

        if (slackPayload) {
          await sendSlackMessage(webhook, slackPayload)
        }

        return { success: true }
      },
    },
  },
})

async function sendSlackMessage(webhookUrl: string, payload: any) {
  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Slack API error: ${response.status} - ${errorText}`)
  }
}
