/* eslint-disable no-console */
import type { Meta, StoryObj } from '@storybook/react'

import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '..'

const meta: Meta<typeof Pagination> = {
  title: 'Components/Pagination',
  component: Pagination,
}

export default meta

type Story = StoryObj<typeof Pagination>

export const BasicUsage: Story = {
  args: {},
  render: () => (
    <Pagination>
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious onClick={() => console.log('previous clicked')} />
        </PaginationItem>
        <PaginationItem>
          <PaginationLink
            onClick={() => console.log('pagination jump link clicked')}
          >
            1
          </PaginationLink>
        </PaginationItem>
        <PaginationItem>
          <PaginationEllipsis />
        </PaginationItem>
        <PaginationItem>
          <PaginationNext onClick={() => console.log('next clicked')} />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  ),
}
/* eslint-enable no-console */
