import { PluginManager } from '@/@saas-boilerplate/providers/plugin-manager/provider'
import { z } from 'zod'

export const mailchimp = PluginManager.plugin({
  slug: 'mailchimp',
  name: 'Mailchimp',
  schema: z.object({
    apiKey: z.string().describe('Your Mailchimp API key (format: xxxxxxxx-xx)'),
    listId: z.string().describe('Your Mailchimp list ID'),
    serverPrefix: z.string().describe('Ex: us1'),
  }),
  metadata: {
    verified: true,
    published: true,
    logo: 'https://imgs.search.brave.com/WyLHoQYyT-XYswNoKuwXfArznmREI9_09uh95dvdH5k/rs:fit:860:0:0:0/g:ce/aHR0cHM6Ly9jZG4u/YnJhbmRmZXRjaC5p/by9pZE12bnYzNmE0/L3cvNDAwL2gvNDAw/L3RoZW1lL2Rhcmsv/aWNvbi5qcGVnP2M9/MWJ4aWQ2NE11cDdh/Y3pld1NBWU1YJnQ9/MTY2ODUxNjA1NjUx/Mw',
    description:
      'Integrate your account with Mailchimp to manage your email campaigns.',
    category: 'email-marketing',
    developer: 'Mailchimp',
    screenshots: [],
    website: 'https://mailchimp.com/',
    links: {
      install: 'https://mailchimp.com/',
      guide: 'https://mailchimp.com/developer/',
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
        const { apiKey, listId, serverPrefix } = config
        const { event, data } = input

        // Mailchimp API base URL
        const baseUrl = `https://${serverPrefix}.api.mailchimp.com/3.0`

        // For lead events, we'll add/update the contact in the list
        if (event === 'lead.created' && data.email) {
          const contactData = {
            email_address: data.email,
            status: 'subscribed',
            merge_fields: {
              FNAME: data.name || '',
              LNAME: '',
              PHONE: data.phone || '',
            },
            tags: ['lead', 'saas-boilerplate'],
          }

          // Add or update contact in Mailchimp list
          const listMemberUrl = `${baseUrl}/lists/${listId}/members/${Buffer.from(data.email.toLowerCase()).toString('hex')}`

          const response = await fetch(listMemberUrl, {
            method: 'PUT', // PUT will create or update
            headers: {
              Authorization: `Basic ${Buffer.from(`anystring:${apiKey}`).toString('base64')}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(contactData),
          })

          if (!response.ok) {
            const errorData = await response.json()
            throw new Error(
              `Mailchimp API error: ${response.status} - ${errorData.detail || response.statusText}`,
            )
          }

          const responseData = await response.json()

          // Send a welcome email or trigger automation if configured
          if (event === 'lead.created') {
            // You could trigger an automation here using Mailchimp's automation API
            console.log(`[Mailchimp] Lead added to list ${listId}`, {
              email: data.email,
              contactId: responseData.id,
              status: responseData.status,
            })
          }

          return {
            success: true,
            contact: {
              id: responseData.id,
              email: responseData.email_address,
              status: responseData.status,
            },
            event,
            timestamp: new Date().toISOString(),
          }
        } else {
          // For other events, you could send a campaign or trigger automation
          console.log(
            `[Mailchimp] Event "${event}" processed (no specific action)`,
            { data, config },
          )
          return {
            success: true,
            event,
            action: 'logged',
            timestamp: new Date().toISOString(),
          }
        }
      },
    },
  },
})
