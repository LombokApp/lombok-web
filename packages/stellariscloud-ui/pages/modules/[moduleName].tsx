import { useAuthContext } from '@stellariscloud/auth-utils'
import type { NextPage } from 'next'
import { useRouter } from 'next/router'
import React from 'react'
import { ModulesUI } from '../../views/module-ui/module-ui.view'

const ModulesIndexPage: NextPage = () => {
  const authContext = useAuthContext()
  const router = useRouter()

  return (
    <div className="h-full w-full flex flex-col justify-around">
      <ModulesUI moduleName={router.query.moduleName as string} />
    </div>
  )
}

export default ModulesIndexPage
