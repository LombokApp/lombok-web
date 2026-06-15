import {
  Tabs,
  TabsList,
  TabsTrigger,
} from '@lombokapp/ui-toolkit/components/tabs'
import {
  ChartLine,
  FileText,
  LayoutDashboard,
  LayoutGrid,
  ListChecks,
  Settings,
  Users,
} from 'lucide-react'

import { DockerIcon } from '@/src/components/icons/docker-icon'

interface ServerTabControlsProps {
  serverPage: string[]
  navigate: (path: string) => void
}

const TABS = [
  {
    value: 'overview',
    label: 'Overview',
    icon: LayoutDashboard,
    path: '/server',
  },
  { value: 'users', label: 'Users', icon: Users, path: '/server/users' },
  { value: 'apps', label: 'Apps', icon: LayoutGrid, path: '/server/apps' },
  {
    value: 'docker',
    label: 'Docker',
    icon: DockerIcon,
    path: '/server/docker',
  },
  { value: 'events', label: 'Events', icon: ChartLine, path: '/server/events' },
  { value: 'tasks', label: 'Tasks', icon: ListChecks, path: '/server/tasks' },
  { value: 'logs', label: 'Logs', icon: FileText, path: '/server/logs' },
  {
    value: 'settings',
    label: 'Settings',
    icon: Settings,
    path: '/server/settings',
  },
] as const

export function ServerTabControls({
  serverPage,
  navigate,
}: ServerTabControlsProps) {
  const activeTab = serverPage[0] || 'overview'

  return (
    <Tabs
      value={activeTab}
      onValueChange={(value) => {
        const tab = TABS.find((t) => t.value === value)
        if (tab) {
          navigate(tab.path)
        }
      }}
    >
      <TabsList>
        {TABS.map(({ value, label, icon: Icon }) => (
          <TabsTrigger key={value} value={value}>
            <Icon className="size-4" />
            {label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  )
}
