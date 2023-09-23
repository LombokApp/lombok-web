import type { NextPage } from 'next'
import React from 'react'

import { ListFoldersScreen } from '../../views/list-folders-screen/list-folders-screen.view'

const FoldersPage: NextPage = () => {
  return (
    <div className="h-full w-full">
      <ListFoldersScreen />
    </div>
  )
}

export default FoldersPage
