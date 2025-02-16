import { useAuthContext } from '../../../auth-utils'
import type { NextPage } from 'next'
import { useRouter } from 'next/router'
import React from 'react'

import { ContentLayout } from '../../components/sidebar/components/content-layout'
import { ServerScreen } from '../../views/server/overview/server-screen/server-screen.view'

const ServerIndexPage: NextPage = () => {
  const authContext = useAuthContext()
  const router = useRouter()
  const serverPage = (router.query.serverPage as string[] | undefined) ?? []
  return (
    authContext.authState.isAuthenticated &&
    authContext.viewer?.isAdmin && (
      <ContentLayout
        breadcrumbs={[{ label: 'Server', href: '/server' }].concat(
          serverPage.map((serverPagePart, i) => ({
            label: `${serverPagePart[0].toUpperCase()}${serverPagePart.slice(1)}`,
            href:
              i === serverPage.length - 1
                ? ''
                : `/server/${serverPage.slice(0, i + 1).join('/')}`,
          })),
        )}
      >
        <ServerScreen
          serverPage={
            !router.query.serverPage
              ? ['overview']
              : (router.query.serverPage as string[])
          }
        />
      </ContentLayout>
    )
  )
}

export default ServerIndexPage
