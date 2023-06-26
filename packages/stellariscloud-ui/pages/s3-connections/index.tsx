import type { NextPage } from 'next'
import React from 'react'

import { ListS3ConnectionsScreen } from '../../views/list-s3-connections-screen/list-s3-connections-screen.view'

const S3ConnectionsPage: NextPage = () => {
  return (
    <div className="h-full w-full">
      <ListS3ConnectionsScreen />
    </div>
  )
}

export default S3ConnectionsPage
