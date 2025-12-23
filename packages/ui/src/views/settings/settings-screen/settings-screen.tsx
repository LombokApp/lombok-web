import { ScrollArea } from '@lombokapp/ui-toolkit/components/scroll-area/scroll-area'
import { cn } from '@lombokapp/ui-toolkit/utils/tailwind'
import { Link } from 'react-router'

import { $api } from '@/src/services/api'

import { ProfilePage } from '../../../pages/settings/profile'
import { UserAccessKeysScreen } from '../../user-access-keys-screen/user-access-keys-screen'
import { UserAppSettingsTab } from '../apps/user-app-settings-tab'
import { UserAppsSettingsTab } from '../apps/user-apps-settings-tab'

export function SettingsScreen({ settingsPath }: { settingsPath: string[] }) {
  const tab = settingsPath[0] ?? 'profile'
  const appIdentifier = settingsPath[1]

  const appsQuery = $api.useQuery('get', '/api/v1/user/apps')

  return (
    <div className="flex max-h-max min-h-0 w-full items-start gap-6 pl-4 pt-4 sm:gap-16">
      <nav
        className="flex flex-col gap-4 pt-6 text-sm text-muted-foreground"
        x-chunk="dashboard-04-chunk-0"
      >
        <Link
          to="/settings/profile"
          className={cn(tab === 'profile' && 'text-primary font-semibold')}
        >
          Profile
        </Link>
        <Link
          to="/settings/access-keys"
          className={cn(tab === 'access-keys' && 'text-primary font-semibold')}
        >
          Access Keys
        </Link>
        <div className="flex flex-col gap-1">
          <Link
            to="/settings/apps"
            className={cn(
              tab === 'apps' && !appIdentifier && 'text-primary font-semibold',
            )}
          >
            App Settings
          </Link>
          {appsQuery.data?.result && appsQuery.data.result.length > 0 && (
            <div className="ml-4 mt-2 flex flex-col gap-1.5 border-l-2 border-muted pl-4">
              {appsQuery.data.result.map((app) => (
                <Link
                  key={app.identifier}
                  to={`/settings/apps/${app.identifier}`}
                  className={cn(
                    'text-xs transition-all duration-200 hover:text-foreground hover:translate-x-0.5',
                    appIdentifier === app.identifier
                      ? 'text-primary font-medium'
                      : 'text-muted-foreground',
                  )}
                >
                  {app.label || app.identifier}
                </Link>
              ))}
            </div>
          )}
        </div>
      </nav>
      <div className="flex size-full max-h-max min-h-0 flex-1 flex-col gap-8">
        <ScrollArea>
          {tab === 'access-keys' ? (
            <UserAccessKeysScreen />
          ) : tab === 'profile' ? (
            <ProfilePage />
          ) : tab === 'apps' && appIdentifier ? (
            <UserAppSettingsTab appIdentifier={appIdentifier} />
          ) : tab === 'apps' ? (
            <UserAppsSettingsTab />
          ) : (
            <></>
          )}
        </ScrollArea>
      </div>
    </div>
  )
}
