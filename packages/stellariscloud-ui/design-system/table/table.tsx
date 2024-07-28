import clsx from 'clsx'
import React from 'react'

export function Table({
  rows,
  headers,
}: {
  rows: (React.ReactNode | string | number)[][]
  headers: (string | { label: string; cellStyles: string })[]
}) {
  return (
    <div className="w-full">
      <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
        <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
          <table className="min-w-full divide-y divide-gray-300 dark:divide-gray-700 border-separate border-spacing-y-3">
            <thead>
              <tr>
                {headers.map((header, i) => (
                  <th
                    key={i}
                    scope="col"
                    className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-400 sm:pl-0"
                  >
                    {typeof header === 'string' ? header : header.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y dark:divide-y-0 divide-gray-200 dark:divide-gray-700 gap-4 py-4">
              {rows.map((cells, i) => (
                <tr key={i} className="pl-2 overflow-hidden">
                  {cells.map((cell, j) => (
                    <td
                      key={j}
                      className={clsx(
                        'bg-white/80 dark:bg-white/10',
                        'border first:border-r-0 last:border-l-0 border-gray-100 dark:border-0',
                        'first:rounded-l-md last:rounded-r-md dark:bg-white/5',
                        typeof headers[j] !== 'string' &&
                          'cellStyles' in (headers[j] as object)
                          ? ((headers[j] as any).cellStyles as string)
                          : 'p-2 pl-0 first:pl-2',
                        j > 0 && j < headers.length - 1 && 'border-x-0',
                      )}
                    >
                      <div className="flex text-gray-700 dark:text-gray-300/90">
                        <div className="flex-shrink-0">{cell}</div>
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
