import { Button } from '@stellariscloud/design-system'
import clsx from 'clsx'

export interface Props {
  currentPage: number
  totalItems: number
  pageSize: number
  setCurrentPage: (page: number) => void
}

export const PageLink = ({
  active,
  disabled,
  label,
  onClick,
}: {
  active?: boolean
  disabled?: boolean
  label: string | number
  onClick: () => void
}) => {
  return (
    <div>
      <Button
        variant="ghost"
        onClick={onClick}
        disabled={disabled || active}
        className={clsx(
          'text-white disabled:text-white',
          'bg-white text-black',
        )}
        aria-current={active ? 'page' : undefined}
      >
        {label}
      </Button>
    </div>
  )
}

export const Pagination = ({
  currentPage,
  totalItems,
  pageSize,
  setCurrentPage,
}: Props) => {
  const totalPages = Math.ceil(totalItems / pageSize)

  const handlePageClick = (page: number) => {
    if (page < 0 || page > totalPages) {
      return
    }
    setCurrentPage(page)
  }
  const previousPages = Math.min(4, currentPage - 1)
  const nextPages = Math.max(0, Math.min(totalPages - currentPage, 4))
  return (
    <nav className="pagination" aria-label="Pagination">
      {currentPage > 0 && (
        <div className="flex gap-2 items-center">
          <PageLink
            label={'Previous'}
            disabled={currentPage === 1}
            onClick={() => handlePageClick(currentPage - 1)}
          />
          {new Array(previousPages).fill(undefined).map((_, idx) => (
            <PageLink
              key={`previous_${idx}`}
              label={currentPage - previousPages + idx}
              active={false}
              disabled={false}
              onClick={() =>
                handlePageClick(idx + (currentPage - previousPages))
              }
            />
          ))}
          <PageLink
            label={currentPage}
            active={true}
            disabled={true}
            onClick={() => undefined}
          />
          {new Array(nextPages).fill(undefined).map((_, idx) => (
            <PageLink
              key={`next_${idx}`}
              label={idx + currentPage + 1}
              active={false}
              disabled={false}
              onClick={() => handlePageClick(idx + currentPage + 1)}
            />
          ))}
          <PageLink
            label={'Next'}
            disabled={currentPage === totalPages}
            onClick={() => handlePageClick(currentPage + 1)}
          />
        </div>
      )}
    </nav>
  )
}
