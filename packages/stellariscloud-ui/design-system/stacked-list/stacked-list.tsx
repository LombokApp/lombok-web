import { Card, CardContent, CardHeader } from '@stellariscloud/ui-toolkit'
import clsx from 'clsx'
import React from 'react'

export function StackedList({
  items,
  className,
}: {
  items: React.ReactNode[]
  className?: string
}) {
  return (
    <div className={clsx('w-full', className)}>
      <div className={clsx('overflow-hidden', 'flex flex-col gap-4')}>
        {items.map((item, i) => (
          <Card key={i}>
            <div className="p-4">{item}</div>
          </Card>
        ))}
      </div>
    </div>
  )
}
