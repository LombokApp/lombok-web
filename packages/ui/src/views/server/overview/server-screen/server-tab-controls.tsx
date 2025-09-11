import { cn } from '@lombokapp/ui-toolkit/utils/tailwind'
import {
  AppWindow,
  ChartLine,
  FileText,
  LayoutGrid,
  ListChecks,
  Settings,
  Users,
} from 'lucide-react'

interface ServerTabControlsProps {
  serverPage: string[]
  navigate: (path: string) => void
}

export function ServerTabControls({
  serverPage,
  navigate,
}: ServerTabControlsProps) {
  return (
    <div
      role="tablist"
      aria-orientation="horizontal"
      className="inline-flex h-10 grow-0 items-center justify-center rounded-md bg-foreground/[.06] p-1 text-muted-foreground"
      tabIndex={0}
      data-orientation="horizontal"
      style={{ outline: 'none' }}
    >
      <button
        type="button"
        role="tab"
        aria-selected={serverPage[0] === 'overview'}
        aria-controls="overview-tab-content"
        data-state={serverPage[0] === 'overview' ? 'active' : 'inactive'}
        id="overview-tab-trigger"
        className={cn(
          'ring-offset-background focus-visible:ring-ring data-[state=active]:bg-background data-[state=active]:text-foreground inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:shadow-sm',
          serverPage[0] === 'overview' &&
            'bg-background text-foreground shadow-sm',
        )}
        tabIndex={-1}
        data-orientation="horizontal"
        onClick={() => navigate('/server')}
      >
        <div className="flex items-center gap-2">
          <LayoutGrid className="size-4" />
          Overview
        </div>
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={serverPage[0] === 'users'}
        aria-controls="users-tab-content"
        data-state={serverPage[0] === 'users' ? 'active' : 'inactive'}
        id="users-tab-trigger"
        className={cn(
          'ring-offset-background focus-visible:ring-ring data-[state=active]:bg-background data-[state=active]:text-foreground inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:shadow-sm',
          serverPage[0] === 'users' &&
            'bg-background text-foreground shadow-sm',
        )}
        tabIndex={-1}
        data-orientation="horizontal"
        onClick={() => navigate('/server/users')}
      >
        <div className="flex items-center gap-2">
          <Users className="size-4" />
          Users
        </div>
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={serverPage[0] === 'apps'}
        aria-controls="apps-tab-content"
        data-state={serverPage[0] === 'apps' ? 'active' : 'inactive'}
        id="apps-tab-trigger"
        className={cn(
          'ring-offset-background focus-visible:ring-ring data-[state=active]:bg-background data-[state=active]:text-foreground inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:shadow-sm',
          serverPage[0] === 'apps' && 'bg-background text-foreground shadow-sm',
        )}
        tabIndex={-1}
        data-orientation="horizontal"
        onClick={() => navigate('/server/apps')}
      >
        <div className="flex items-center gap-2">
          <AppWindow className="size-4" />
          Apps
        </div>
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={serverPage[0] === 'events'}
        aria-controls="events-tab-content"
        data-state={serverPage[0] === 'events' ? 'active' : 'inactive'}
        id="events-tab-trigger"
        className={cn(
          'ring-offset-background focus-visible:ring-ring data-[state=active]:bg-background data-[state=active]:text-foreground inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:shadow-sm',
          serverPage[0] === 'events' &&
            'bg-background text-foreground shadow-sm',
        )}
        tabIndex={-1}
        data-orientation="horizontal"
        onClick={() => navigate('/server/events')}
      >
        <div className="flex items-center gap-2">
          <ChartLine className="size-4" />
          Events
        </div>
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={serverPage[0] === 'tasks'}
        aria-controls="tasks-tab-content"
        data-state={serverPage[0] === 'tasks' ? 'active' : 'inactive'}
        id="tasks-tab-trigger"
        className={cn(
          'ring-offset-background focus-visible:ring-ring data-[state=active]:bg-background data-[state=active]:text-foreground inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:shadow-sm',
          serverPage[0] === 'tasks' &&
            'bg-background text-foreground shadow-sm',
        )}
        tabIndex={-1}
        data-orientation="horizontal"
        onClick={() => navigate('/server/tasks')}
      >
        <div className="flex items-center gap-2">
          <ListChecks className="size-4" />
          Tasks
        </div>
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={serverPage[0] === 'logs'}
        aria-controls="logs-tab-content"
        data-state={serverPage[0] === 'logs' ? 'active' : 'inactive'}
        id="logs-tab-trigger"
        className={cn(
          'ring-offset-background focus-visible:ring-ring data-[state=active]:bg-background data-[state=active]:text-foreground inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:shadow-sm',
          serverPage[0] === 'logs' && 'bg-background text-foreground shadow-sm',
        )}
        tabIndex={-1}
        data-orientation="horizontal"
        onClick={() => navigate('/server/logs')}
      >
        <div className="flex items-center gap-2">
          <FileText className="size-4" />
          Logs
        </div>
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={serverPage[0] === 'settings'}
        aria-controls="settings-tab-content"
        data-state={serverPage[0] === 'settings' ? 'active' : 'inactive'}
        id="settings-tab-trigger"
        className={cn(
          'ring-offset-background focus-visible:ring-ring data-[state=active]:bg-background data-[state=active]:text-foreground inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:shadow-sm',
          serverPage[0] === 'settings' &&
            'bg-background text-foreground shadow-sm',
        )}
        tabIndex={-1}
        data-orientation="horizontal"
        onClick={() => navigate('/server/settings')}
      >
        <div className="flex items-center gap-2">
          <Settings className="size-4" />
          Settings
        </div>
      </button>
    </div>
  )
}
