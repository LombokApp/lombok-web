import { ChevronDownIcon } from '@heroicons/react/24/outline'
import { Icon } from '@stellariscloud/design-system'
import clsx from 'clsx'
import Link from 'next/link'
import React from 'react'

import { useLoggingContext } from '../../contexts/logging.context'

export const LogPanel = ({ folderId }: { folderId?: string }) => {
  const logging = useLoggingContext()
  const [isMinimised, setIsMinimised] = React.useState(true)
  const lines = !folderId
    ? logging.logs.lines
    : logging.logs.lines.filter((logLine) => logLine.folderId === folderId)
  return (
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
    <div
      onClick={() => isMinimised && setIsMinimised(false)}
      key={logging.logs.lastChangeKey}
      className={clsx(
        isMinimised ? 'cursor-pointer h-[1.7rem]' : 'h-[8rem] overflow-y-auto',
        'overflow-hidden duration-200 ease-in-out',
        'mb-6',
        'flex flex-col',
        'text-xs',
        'font-mono',
        'border-b border-b-3 border-gray-800',
        'border-t-2 border-gray-400',
      )}
    >
      <div className="absolute p-[.1rem] z-20">
        {isMinimised ? (
          <div className="badge">{logging.logs.lines.length}</div>
        ) : (
          // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
          <div
            className="cursor-pointer p-[.15rem] pl-[.3rem] -mt-[.2rem]"
            onClick={() => setIsMinimised(true)}
          >
            <Icon size="md" icon={ChevronDownIcon} />
          </div>
        )}
      </div>
      {lines.length === 0 && (
        <span className="pl-10 pt-1 opacity-50 italic">Log empty</span>
      )}
      {lines.map((line, i) => (
        <div
          key={i}
          className={clsx(
            'flex p-1 px-2 pl-8',
            'even:bg-gray-700 odd:bg-gray-900',
          )}
        >
          {Array(7 - line.level.length)
            .fill('')
            .map((_, j) => (
              <span key={j}>&nbsp;</span>
            ))}
          {line.level}:&nbsp;<span className="italic">{line.message}</span>
          {
            <>
              {line.folderId && (
                <>
                  &nbsp;- folder:
                  <strong>
                    <Link href={`/folders/${line.folderId}`}>
                      <span className="underline opacity-50 hover:opacity-75 hover:text-semibold">
                        {line.folderId}
                      </span>
                    </Link>
                  </strong>
                </>
              )}
              <>
                {line.objectKey && (
                  <>
                    &nbsp;- object:
                    <strong>
                      <Link
                        href={`/folders/${line.folderId}/${encodeURIComponent(
                          line.objectKey,
                        )}`}
                      >
                        <span className="underline opacity-50 hover:opacity-75 hover:text-semibold">
                          {line.objectKey}
                        </span>
                      </Link>
                    </strong>
                  </>
                )}
              </>
            </>
          }
        </div>
      ))}
    </div>
  )
}
