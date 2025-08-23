import { ScrollArea } from '@stellariscloud/ui-toolkit'
import { useNavigate, useParams } from 'react-router-dom'

import { ServerAppDetailScreen } from '../../apps/server-app-detail-screen/server-app-detail-screen.view'
import { ServerAppsScreen } from '../../apps/server-apps-screen/server-apps-screen.view'
import { ServerSettingsScreen } from '../../config/server-config-screen/server-config-screen'
import { ServerEventDetailScreen } from '../../events/server-event-detail-screen/server-event-detail-screen.view'
import { ServerEventsScreen } from '../../events/server-events-screen/server-events-screen.view'
import { ServerLogsScreen } from '../../logs/server-logs-screen/server-logs-screen.view'
import { ServerTaskDetailScreen } from '../../tasks/server-task-detail-screen/server-task-detail-screen.view'
import { ServerTasksScreen } from '../../tasks/server-tasks-screen/server-tasks-screen.view'
import { ServerUserDetailScreen } from '../../users/server-user-detail-screen/server-user-detail-screen.view'
import { ServerUsersScreen } from '../../users/server-users-screen/server-users-screen.view'
import { ServerOverviewContent } from './server-overview-content'
import { ServerTabControls } from './server-tab-controls'

export function ServerScreen({ serverPage }: { serverPage: string[] }) {
  const navigate = useNavigate()
  const params = useParams()
  const paramParts = params['*']?.split('/') ?? []
  return (
    <div className="container flex size-full flex-col gap-6 pt-6">
      <div className="flex w-full flex-col items-start">
        <ServerTabControls
          serverPage={serverPage}
          navigate={(path) => {
            void navigate(path)
          }}
        />
      </div>
      <div className="flex max-h-max min-h-0 flex-1 flex-col overflow-x-visible pb-6">
        {(serverPage[0] === 'overview' || !serverPage[0]) && (
          <ScrollArea>
            <ServerOverviewContent />
          </ScrollArea>
        )}
        {serverPage[0] === 'users' && !serverPage[1] && <ServerUsersScreen />}
        {serverPage[0] === 'events' && !serverPage[1] && <ServerEventsScreen />}
        {serverPage[0] === 'apps' && !serverPage[1] && <ServerAppsScreen />}
        {serverPage[0] === 'tasks' && !serverPage[1] && <ServerTasksScreen />}
        {serverPage[0] === 'logs' && !serverPage[1] && <ServerLogsScreen />}
        {serverPage[0] === 'settings' && !!serverPage[0] && (
          <ServerSettingsScreen tab={paramParts[1] ?? 'general'} />
        )}
        {serverPage[0] === 'events' && serverPage[1] && (
          <ScrollArea>
            <ServerEventDetailScreen eventId={serverPage[1]} />
          </ScrollArea>
        )}
        {serverPage[0] === 'apps' && !!serverPage[1] && (
          <ScrollArea>
            <ServerAppDetailScreen appIdentifier={serverPage[1]} />
          </ScrollArea>
        )}
        {serverPage[0] === 'users' && !!serverPage[1] && (
          <ScrollArea>
            <ServerUserDetailScreen userId={serverPage[1]} />
          </ScrollArea>
        )}
        {serverPage[0] === 'tasks' && !!serverPage[1] && (
          <ScrollArea>
            <ServerTaskDetailScreen taskId={serverPage[1]} />
          </ScrollArea>
        )}
      </div>
    </div>
  )
}
