import { Navigate, useParams } from 'react-router'

import { ContentLayout } from '../../components/sidebar/components/content-layout'
import { SettingsScreen } from '../../views/settings/settings-screen/settings-screen'

export const SettingsIndexPage = () => {
  const { '*': subPath } = useParams()
  const settingsPage = subPath?.length ? subPath.split('/').filter(Boolean) : []

  // Redirect to profile if no path specified
  if (settingsPage.length === 0) {
    return <Navigate to="/settings/profile" replace />
  }

  return (
    <ContentLayout
      breadcrumbs={[{ label: 'Settings', href: '/settings' }].concat(
        settingsPage.map((settingsPagePart, i) => ({
          label: `${settingsPagePart[0]?.toUpperCase() ?? ''}${settingsPagePart.slice(1)}`,
          href:
            i === settingsPage.length - 1
              ? ''
              : `/settings/${settingsPage.slice(0, i + 1).join('/')}`,
        })),
      )}
    >
      <SettingsScreen settingsPath={settingsPage} />
    </ContentLayout>
  )
}
