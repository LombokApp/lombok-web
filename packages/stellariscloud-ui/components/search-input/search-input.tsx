import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { Button, Icon, Input } from '@stellariscloud/design-system'
import React from 'react'

export const SearchInput = ({
  onChangeSearchTerm,
  searchTerm,
}: {
  onChangeSearchTerm: (searchTerm?: string) => void
  searchTerm?: string
}) => {
  const [searchTermInputValue, setSearchTermInputValue] =
    React.useState<string>('')
  const [isEditing, setIsEditing] = React.useState(false)

  const inputRef = React.useRef<HTMLInputElement>(null)
  const buttonRef = React.useRef<HTMLButtonElement>(null)

  const handleInputBlurOrEnter = () => {
    if (searchTermInputValue) {
      onChangeSearchTerm(searchTermInputValue)
    }

    setSearchTermInputValue('')
    setIsEditing(false)
  }

  return (
    <div>
      {isEditing ? (
        <div className="flex gap-2">
          <Input
            onKeyDown={(e) =>
              (e.key === 'Enter' || e.keyCode === 13) &&
              handleInputBlurOrEnter()
            }
            ref={inputRef}
            onBlur={handleInputBlurOrEnter}
            componentSize={'md'}
            label=""
            placeholder={
              searchTerm ? `filtered by "${searchTerm}"` : 'Filter by filename'
            }
            value={searchTermInputValue}
            onChange={(e) => setSearchTermInputValue(e.target.value)}
          />
        </div>
      ) : !searchTerm ? (
        <Button
          onClick={() => {
            setIsEditing(true)
            setTimeout(() => {
              inputRef.current?.focus()
            }, 100)
          }}
        >
          <div className="flex gap-2 items-center">
            <Icon size="md" className="shrink-0" icon={MagnifyingGlassIcon} />
            <div className="shrink-0">Filter by filename</div>
          </div>
        </Button>
      ) : (
        <Button
          ref={buttonRef}
          className="flex gap-2 items-center"
          onClick={() => onChangeSearchTerm()}
        >
          <Icon size="md" icon={MagnifyingGlassIcon} />
          &#34;{searchTerm}&#34;
          <Icon size="md" icon={XMarkIcon} />
        </Button>
      )}
    </div>
  )
}
