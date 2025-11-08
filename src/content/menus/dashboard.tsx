import {
  SettingsIcon,
  PuzzleIcon,
  SendIcon,
  HelpCircleIcon,
  Users2Icon,
  Layers2Icon,
  MessageSquareIcon,
  Sparkles,
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
          id: 'sidebar_prompts',
          title: 'Prompts',
          url: '/app/prompts',
          icon: Sparkles,
        },
        {
          id: 'sidebar_disparos',
          title: 'Disparos',
          url: 'https://acesso.whatlead.com.br/',
          icon: PuzzleIcon,
          external: true,
        },

        // {
        //   id: 'sidebar_integrations',
        //   title: 'Apps',
        //   url: '/app/integrations',
        //   icon: PuzzleIcon,
        // },
        {
          id: 'sidebar_settings',
          title: 'Settings',
          url: '/app/settings/account/profile',
          icon: SettingsIcon,
        },
      ],
    },
  ],
}
