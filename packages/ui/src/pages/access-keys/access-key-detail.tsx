import { useParams } from 'react-router-dom'

import { ContentLayout } from '../../components/sidebar/components/content-layout'
import { UserAccessKeyDetailScreen } from '../../views/user-access-key-detail-screen/user-access-key-detail-screen.view'

const AccessKeyDetailInner = ({ paramParts }: { paramParts: string[] }) => {
  const accessKeyHashId = paramParts[0]
  return (
    <ContentLayout
      breadcrumbs={
        [
          { label: 'Access Keys', href: '/access-keys' },
          {
            label: accessKeyHashId,
            // href: `/access-keys/${accessKeyHashId}`,
          },
        ] as { href?: string; label: string }[]
      }
    >
      <div className="flex size-full flex-1 flex-col gap-4">
        {accessKeyHashId && (
          <UserAccessKeyDetailScreen accessKeyHashId={accessKeyHashId} />
        )}
      </div>
    </ContentLayout>
  )
}

export const AccessKeyDetailPage = () => {
  const params = useParams()
  const paramParts = params['*']?.split('/') ?? []
  const accessKeyHashId = paramParts[0]
  return accessKeyHashId ? (
    <AccessKeyDetailInner paramParts={paramParts} />
  ) : (
    <></>
  )
}
