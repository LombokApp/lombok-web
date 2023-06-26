import clsx from 'clsx'
import React from 'react'

const GRAYSCALE = { label: 'Grayscale', id: 'grayscale' }

export const ImageFiltersPanel = ({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  folderId,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  objectKey,
}: {
  folderId: string
  objectKey: string
}) => {
  const [activeOption, setActiveOption] = React.useState(GRAYSCALE)
  const optionClasses =
    'border-4 cursor-pointer p-4 px-6 bg-gray-100 hover:bg-gray-400 duration-200 text-gray-800 rounded'

  const filterOptions: { label: string; id: string }[] = [
    GRAYSCALE,
    { label: 'Red', id: 'red' },
    { label: 'Green', id: 'green' },
    { label: 'Blue', id: 'blue' },
  ]
  return (
    <div className="flex flex-1 flex-col w-full h-full">
      <div className="grid grid-cols-2 gap-8 p-4 text-xl">
        {filterOptions.map((f) => (
          // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
          <div
            key={f.id}
            className={clsx(
              'w-full',
              optionClasses,
              activeOption === f && 'border-accent',
            )}
            onClick={() => setActiveOption(f)}
          >
            {f.label}
          </div>
        ))}
      </div>
    </div>
  )
}
