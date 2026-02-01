import { cn } from '@lombokapp/ui-toolkit/utils/tailwind'
import { Link } from 'react-router'

import { $api } from '@/src/services/api'

import { ProfilePage } from '../../../pages/settings/profile'
import { UserAccessKeysScreen } from '../../user-access-keys-screen/user-access-keys-screen'
import { UserAppSettingsTab } from '../apps/user-app-settings-tab'
import { UserAppsSettingsTab } from '../apps/user-apps-settings-tab'
import { UserNotificationSettingsTab } from '../user-notification-settings-tab'

export function UserSettingsScreen({
  settingsPath,
}: {
  settingsPath: string[]
}) {
  const tab = settingsPath[0] ?? 'profile'
  const appIdentifier = settingsPath[1]

  const appsQuery = $api.useQuery('get', '/api/v1/user/apps')

  return (
    <div className="flex max-h-max min-h-0 w-full  justify-around gap-6 pl-4 pt-4 ">
      <div className="container flex w-full items-start sm:gap-16">
        <nav
          className="absolute flex min-w-48 flex-col gap-4 pt-6 text-sm text-muted-foreground"
          x-chunk="dashboard-04-chunk-0"
        >
          <Link
            to="/account/settings/profile"
            className={cn(tab === 'profile' && 'text-primary font-semibold')}
          >
            Profile
          </Link>
          <Link
            to="/account/settings/access-keys"
            className={cn(
              tab === 'access-keys' && 'text-primary font-semibold',
            )}
          >
            Access Keys
          </Link>
          <Link
            to="/account/settings/notifications"
            className={cn(
              tab === 'notifications' && 'text-primary font-semibold',
            )}
          >
            Notifications
          </Link>
          <div className="flex flex-col gap-1">
            <Link
              to="/account/settings/apps"
              className={cn(
                tab === 'apps' &&
                  !appIdentifier &&
                  'text-primary font-semibold',
              )}
            >
              Apps
            </Link>
            {appsQuery.data?.result && appsQuery.data.result.length > 0 && (
              <div className="ml-4 mt-2 flex flex-col gap-1.5 border-l-2 border-muted pl-4">
                {appsQuery.data.result.map((app) => (
                  <Link
                    key={app.identifier}
                    to={`/account/settings/apps/${app.identifier}`}
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
        <div className="flex h-full max-h-max min-h-0 flex-1 flex-col gap-8 py-6 pl-44">
          <div className="flex h-full flex-col items-center [&>*:first-child]:!size-full">
            {tab === 'access-keys' ? (
              <UserAccessKeysScreen />
            ) : tab === 'profile' ? (
              <ProfilePage />
            ) : tab === 'notifications' ? (
              <UserNotificationSettingsTab />
            ) : tab === 'apps' && appIdentifier ? (
              <UserAppSettingsTab appIdentifier={appIdentifier} />
            ) : tab === 'apps' ? (
              <UserAppsSettingsTab />
            ) : (
              <></>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
