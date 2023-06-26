import { Button, Heading, Input } from '@stellariscloud/design-system'
import type { NextPage } from 'next'
import React from 'react'

import { SearchInput } from '../components/search-input/search-input'
// import { TagDropdown } from '../components/tag-dropdown/tag-dropdown'

export const ComponentContainer = ({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) => {
  return (
    <div className="flex flex-col gap-6">
      <Heading level={3}>{title}</Heading>
      <div className="pl-3">{children}</div>
    </div>
  )
}
const ComponentsPage: NextPage = () => {
  const [searchTerm, setSearchTerm] = React.useState('')
  // const [tags, setTags] = React.useState([
  //   {
  //     id: 'item-1',
  //     name: 'Favourites',
  //     createdAt: 0,
  //     updatedAt: 0,
  //   },
  //   {
  //     id: 'item-2',
  //     name: 'Other',
  //     createdAt: 0,
  //     updatedAt: 0,
  //   },
  // ])

  return (
    <div className="h-full w-full p-10 flex flex-col gap-10 bg-black/[.5] overflow-y-auto">
      <ComponentContainer title="Buttons">
        <div className="flex gap-2">
          <Button variant="primary">Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="accent">Accent</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="link">Link</Button>
        </div>
      </ComponentContainer>
      <ComponentContainer title="Inputs">
        <div className="flex flex-col gap-4">
          <div>
            <Heading level={6}>Standard input</Heading>
            <Input />
          </div>
          <div>
            <Heading level={6}>Search input</Heading>
            <SearchInput
              searchTerm={searchTerm}
              onChangeSearchTerm={(term) => setSearchTerm(term ?? '')}
            />
          </div>
        </div>
      </ComponentContainer>

      {/* <ComponentContainer title="Dropdowns">
        <div className="flex flex-col gap-4">
          <div>
            <Heading level={6}>Regular</Heading>
            <Dropdown
              items={[
                { id: 'item-1', label: 'Item 1' },
                { id: 'item-2', label: 'Item 2' },
              ]}
              emptyLabel={'None selected'}
              onItemSelect={() => undefined}
            />
          </div>
          <div>
            <Heading level={6}>Tag dropdown</Heading>
            <TagDropdown
              shouldShowCreate={false}
              tags={tags}
              onSelectTag={() => undefined}
            />
          </div>
          <div>
            <Heading level={6}>Tag dropdown with create</Heading>
            <TagDropdown
              folderTags={tags}
              onSelectTag={() => undefined}
              tags={(tag) => {
                setTags(
                  tags.concat([
                    { id: tag, name: tag, createdAt: 0, updatedAt: 0 },
                  ]),
                )
                return Promise.resolve({
                  id: tag,
                  name: tag,
                  createdAt: 0,
                  updatedAt: 0,
                })
              }}
            />
          </div>
        </div>
      </ComponentContainer> */}
    </div>
  )
}

export default ComponentsPage
