import clsx from 'clsx'
import React from 'react'

import { Button } from '../../design-system/button/button'
import { ImageFiltersPanel } from './image-filters-panel.view'

export const ImageEditorPanel = ({
  folderId,
  objectKey,
}: {
  folderId: string
  objectKey: string
}) => {
  const [activeTab, setActiveTab] = React.useState('Filters')
  const tabClasses =
    'cursor-pointer p-4 px-6 bg-gray-100 hover:bg-gray-400 duration-200 text-gray-800 rounded'
  const tabs = ['Filters', 'Crop']
  return (
    <div className="flex flex-1 flex-col w-full h-full">
      <div className="flex gap-4 p-4 text-xl bg-gray-700">
        {tabs.map((t) => (
          // eslint-disable-next-line jsx-a11y/no-static-element-interactions, jsx-a11y/click-events-have-key-events
          <div
            key={t}
            className={clsx(tabClasses, activeTab === t && 'bg-gray-500')}
            onClick={() => setActiveTab(t)}
          >
            {t}
          </div>
        ))}
      </div>
      <div className="flex-1">
        {activeTab === 'Filters' && (
          <ImageFiltersPanel folderId={folderId} objectKey={objectKey} />
        )}
        {activeTab === 'Crop' && <div>Crop body</div>}
      </div>
      <div className="p-4">
        <Button size="lg" className="w-full" primary>
          Save
        </Button>
      </div>
    </div>
  )
}
