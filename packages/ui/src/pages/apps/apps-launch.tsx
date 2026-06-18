import { ContentLayout } from '../../components/sidebar/components/content-layout'
import { AppsLaunchScreen } from '../../views/apps-launch/apps-launch-screen.view'

export const AppsLaunchPage = () => {
  return (
    <ContentLayout breadcrumbs={[{ label: 'Apps' }]} contentPadding={false}>
      <AppsLaunchScreen />
    </ContentLayout>
  )
}
