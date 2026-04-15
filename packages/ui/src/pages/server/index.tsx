import { useAuthContext } from '@lombokapp/auth-utils'
import { useParams } from 'react-router'

import { ContentLayout } from '../../components/sidebar/components/content-layout'
import { useDockerBreadcrumbs } from '../../views/server/docker/use-docker-breadcrumbs'
import { ServerScreen } from '../../views/server/overview/server-screen/server-screen.view'

function useServerBreadcrumbs(serverPage: string[]) {
  const dockerBreadcrumbs = useDockerBreadcrumbs(serverPage)
  const isDocker = serverPage[0] === 'docker'

  if (isDocker) {
    return dockerBreadcrumbs
  }

  return [{ label: 'Server', href: '/server' }].concat(
    serverPage.map((serverPagePart, i) => ({
      label: `${serverPagePart[0]?.toUpperCase() ?? ''}${serverPagePart.slice(1)}`,
      href:
        i === serverPage.length - 1
          ? ''
          : `/server/${serverPage.slice(0, i + 1).join('/')}`,
    })),
  )
}

export const ServerIndexPage = () => {
  const authContext = useAuthContext()
  const { '*': subPath } = useParams()
  const serverPage = subPath?.length ? subPath.split('/') : []
  const breadcrumbs = useServerBreadcrumbs(serverPage)

  return (
    authContext.authState.isAuthenticated &&
    authContext.viewer?.isAdmin && (
      <ContentLayout breadcrumbs={breadcrumbs}>
        <ServerScreen
          serverPage={!serverPage.length ? ['overview'] : serverPage}
        />
      </ContentLayout>
    )
  )
}
