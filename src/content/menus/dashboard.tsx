import {
  SettingsIcon,
  PuzzleIcon,
  SendIcon,
  HelpCircleIcon,
  Users2Icon,
  Layers2Icon,
  MessageSquareIcon,
} from 'lucide-react'

export const dashboardSidebarMenu = {
  groups: [
    {
      id: 'main-menu',
      name: '',
      menu: [
        {
          id: 'sidebar_chat',
          title: 'Chat',
          url: '/app',
          icon: MessageSquareIcon,
        },
        {
          id: 'sidebar_integrations',
          title: 'Apps',
          url: '/app/integrations',
          icon: PuzzleIcon,
        },
        {
          id: 'sidebar_settings',
          title: 'Settings',
          url: '/app/settings/account/profile',
          icon: SettingsIcon,
        },
      ],
    },
    {
      id: 'support-menu',
      name: 'Support',
      menu: [
        {
          id: 'help-center',
          title: 'Help Center',
          url: '/help',
          icon: HelpCircleIcon,
        },
        {
          id: 'send-feedback',
          title: 'Send Feedback',
          url: '/contact',
          icon: SendIcon,
        },
      ],
    },
  ],
}
