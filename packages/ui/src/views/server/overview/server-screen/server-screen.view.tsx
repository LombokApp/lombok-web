import { ScrollArea } from '@lombokapp/ui-toolkit/components/scroll-area/scroll-area'
import { useNavigate } from 'react-router'

import { ServerAppDetailScreen } from '../../apps/server-app-detail-screen/server-app-detail-screen.view'
import { ServerAppsScreen } from '../../apps/server-apps-screen/server-apps-screen.view'
import { ServerSettingsScreen } from '../../config/server-config-screen/server-config-screen'
import { ServerDockerContainerDetailScreen } from '../../docker/server-docker-container-detail-screen.view'
import { ServerDockerHostDetailScreen } from '../../docker/server-docker-host-detail-screen.view'
import { ServerDockerScreen } from '../../docker/server-docker-screen.view'
import { ServerEventDetailScreen } from '../../events/server-event-detail-screen/server-event-detail-screen.view'
import { ServerEventsScreen } from '../../events/server-events-screen/server-events-screen.view'
import { ServerLogsScreen } from '../../logs/server-logs-screen/server-logs-screen.view'
import { ServerTaskDetailScreen } from '../../tasks/server-task-detail-screen/server-task-detail-screen.view'
import { ServerTasksScreen } from '../../tasks/server-tasks-screen/server-tasks-screen.view'
import { ServerUserDetailScreen } from '../../users/server-user-detail-screen/server-user-detail-screen.view'
import { ServerUsersScreen } from '../../users/server-users-screen/server-users-screen.view'
import { ServerOverviewContent } from './server-overview-content'
import { ServerTabControls } from './server-tab-controls'

const NonScrollContainer = ({ children }: { children: React.ReactNode }) => (
  <div className="flex h-full flex-col items-center">{children}</div>
)

const ScrollContainer = ({ children }: { children: React.ReactNode }) => (
  <ScrollArea className="flex size-full flex-col items-center">
    {children}
  </ScrollArea>
)

export function ServerScreen({ serverPage }: { serverPage: string[] }) {
  const navigate = useNavigate()
  const isAppsScreen = serverPage[0] === 'apps' && !serverPage[1]
  const isUsersScreen = serverPage[0] === 'users' && !serverPage[1]
  const isEventsScreen = serverPage[0] === 'events' && !serverPage[1]
  const isTasksScreen = serverPage[0] === 'tasks' && !serverPage[1]
  const isLogsScreen = serverPage[0] === 'logs' && !serverPage[1]
  const isDockerScreen = serverPage[0] === 'docker' && !serverPage[1]
  const isOverviewScreen = serverPage[0] === 'overview' || !serverPage[0]
  const isSettingsScreen = serverPage[0] === 'settings'
  const shouldNotUseScrollContainer = [
    isAppsScreen,
    isUsersScreen,
    isEventsScreen,
    isTasksScreen,
    isDockerScreen,
    isLogsScreen,
  ].find((t) => !!t)
  const ContainerElement = shouldNotUseScrollContainer
    ? NonScrollContainer
    : ScrollContainer
  return (
    <div className="flex size-full flex-col items-center gap-6 pt-6">
      <div className="flex size-full max-h-full min-h-0 flex-col items-center gap-6">
        <div className="container">
          <ServerTabControls
            serverPage={serverPage}
            navigate={(path) => {
              void navigate(path)
            }}
          />
        </div>
        <div className="flex max-h-max min-h-0 w-full flex-1">
          <div className="flex min-h-max w-full flex-1 flex-col self-stretch overflow-x-visible">
            <ContainerElement>
              <div className="container mx-auto h-full">
                <div className="flex size-full flex-col items-center [&>*:first-child]:!h-full [&>*:first-child]:!w-full [&>*:first-child]:pb-4">
                  {isOverviewScreen && <ServerOverviewContent />}
                  {isUsersScreen && <ServerUsersScreen />}
                  {isEventsScreen && <ServerEventsScreen />}
                  {isAppsScreen && <ServerAppsScreen />}
                  {isTasksScreen && <ServerTasksScreen />}
                  {isDockerScreen && <ServerDockerScreen />}
                  {isLogsScreen && <ServerLogsScreen />}
                  {isSettingsScreen && (
                    <ServerSettingsScreen
                      serverSettingsPath={serverPage.slice(1)}
                    />
                  )}
                  {serverPage[0] === 'events' && serverPage[1] && (
                    <ServerEventDetailScreen eventId={serverPage[1]} />
                  )}
                  {serverPage[0] === 'apps' && !!serverPage[1] && (
                    <ServerAppDetailScreen appIdentifier={serverPage[1]} />
                  )}
                  {serverPage[0] === 'users' && !!serverPage[1] && (
                    <ServerUserDetailScreen userId={serverPage[1]} />
                  )}
                  {serverPage[0] === 'tasks' && !!serverPage[1] && (
                    <ServerTaskDetailScreen taskId={serverPage[1]} />
                  )}
                  {serverPage[0] === 'docker' &&
                    serverPage[1] &&
                    serverPage[2] === 'containers' &&
                    serverPage[3] && (
                      <ServerDockerContainerDetailScreen
                        hostId={serverPage[1]}
                        containerId={serverPage[3]}
                      />
                    )}
                  {serverPage[0] === 'docker' &&
                    !!serverPage[1] &&
                    !serverPage[2] && (
                      <ServerDockerHostDetailScreen hostId={serverPage[1]} />
                    )}
                </div>
              </div>
            </ContainerElement>
          </div>
        </div>
      </div>
    </div>
  )
}
