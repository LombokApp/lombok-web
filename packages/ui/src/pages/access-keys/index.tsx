import { ContentLayout } from '../../components/sidebar/components/content-layout'
import { UserAccessKeysScreen } from '../../views/user-access-keys-screen/user-access-keys-screen'

export const AccessKeysPage = () => {
  return (
    <ContentLayout breadcrumbs={[{ label: 'Access Keys' }]}>
      <UserAccessKeysScreen />
    </ContentLayout>
  )
}
