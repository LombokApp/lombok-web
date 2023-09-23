import type { NextPage } from 'next'
import { useRouter } from 'next/router'
import React from 'react'

import { FolderContextProvider } from '../../../contexts/folder.context'
import { FolderDetailScreen } from '../../../views/folder-detail-screen/folder-detail-screen.view'

const FolderDetail: NextPage = () => {
  const router = useRouter()
  return (
    <div className="flex flex-col overflow-hidden h-full w-full">
      <div className="flex flex-1 justify-center h-full w-full">
        <section className="flex flex-col h-full w-full">
          <div className="flex flex-col flex-1 h-full gap-4 w-full">
            {router.query.folderId && (
              <FolderContextProvider folderId={router.query.folderId as string}>
                <FolderDetailScreen />
              </FolderContextProvider>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}

export default FolderDetail
