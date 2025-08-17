import type { PaginationState, SortingState } from '@tanstack/table-core'

/**
 * Configuration for filter types
 */
export interface DataTableFilterConfig {
  /** Whether this filter is a search filter (single value) */
  isSearchFilter?: boolean
  /** The prefix to use for URL params (e.g., 'status' becomes 'status-') */
  paramPrefix?: string
  /** Normalize values to a specific case when reading/writing */
  normalizeTo?: 'upper' | 'lower'
}

/**
 * Reads filter values from search params on initial load
 * @param searchParams - The URL search params object
 * @param filterConfigs - Configuration for each filter type
 * @returns Record<string, string[]> - The filters object with arrays for each filter type
 */
export function readFiltersFromSearchParams(
  searchParams: URLSearchParams,
  filterConfigs: Record<string, DataTableFilterConfig>,
): Record<string, string[]> {
  const filters: Record<string, string[]> = {}

  Object.entries(filterConfigs).forEach(([filterKey, config]) => {
    if (config.isSearchFilter) {
      // Special case for search filters - single value
      const searchValue = searchParams.get(filterKey)
      filters[filterKey] = searchValue ? [searchValue] : []
    } else {
      // Dynamic filters - multiple values with prefix
      const prefix = config.paramPrefix || filterKey
      // Get all values for this filter key
      const values = searchParams.getAll(prefix)
      const normalizedValues = values.map((value) => {
        if (config.normalizeTo === 'upper') {
          return value.toUpperCase()
        }
        if (config.normalizeTo === 'lower') {
          return value.toLowerCase()
        }
        return value
      })
      filters[filterKey] = normalizedValues
    }
  })

  return filters
}

/**
 * Merges filter updates into search params
 * @param newFilters - The new filters from the DataTable component
 * @param currentSearchParams - The current search params object
 * @param filterConfigs - Configuration for each filter type
 * @returns URLSearchParams - The new search params object
 */
export function convertFiltersToSearchParams(
  newFilters: Record<string, string[]>,
  currentSearchParams: URLSearchParams,
  filterConfigs: Record<string, DataTableFilterConfig>,
): URLSearchParams {
  const newSearchParams = new URLSearchParams(currentSearchParams)

  // Process each filter configuration
  Object.entries(filterConfigs).forEach(([filterKey, config]) => {
    if (config.isSearchFilter) {
      // Handle search filters
      if (filterKey in newFilters) {
        const rawValue = newFilters[filterKey]?.[0]
        const trimmedValue =
          typeof rawValue === 'string' ? rawValue.trim() : undefined

        if (trimmedValue && trimmedValue.length > 0) {
          const normalizedValue =
            config.normalizeTo === 'upper'
              ? trimmedValue.toUpperCase()
              : config.normalizeTo === 'lower'
                ? trimmedValue.toLowerCase()
                : trimmedValue
          newSearchParams.set(filterKey, normalizedValue)
        } else {
          // Remove search filter if value is missing or empty
          newSearchParams.delete(filterKey)
        }
      } else {
        // Remove search filter if not in new filters
        newSearchParams.delete(filterKey)
      }
    } else {
      // Handle dynamic filters
      const prefix = config.paramPrefix || filterKey

      // Remove all existing dynamic filter params for this filter type
      newSearchParams.delete(prefix)

      // Add new dynamic filter params if present in new filters
      if (filterKey in newFilters && newFilters[filterKey]) {
        newFilters[filterKey]
          .map((value) => (typeof value === 'string' ? value.trim() : value))
          .filter((value): value is string =>
            Boolean(value && value.length > 0),
          )
          .forEach((value) => {
            const normalizedValue =
              config.normalizeTo === 'upper'
                ? value.toUpperCase()
                : config.normalizeTo === 'lower'
                  ? value.toLowerCase()
                  : value
            newSearchParams.append(prefix, normalizedValue)
          })
      }
    }
  })

  return newSearchParams
}

/**
 * Reads sorting state from search params on initial load
 * @param searchParams - The URL search params object
 * @returns SortingState - The sorting state object
 */
export function readSortingFromSearchParams(
  searchParams: URLSearchParams,
): SortingState {
  const sorting: SortingState = []

  // Get all sort parameters (URLSearchParams.getAll returns all values for a key)
  const sortParams = searchParams.getAll('sort')

  sortParams.forEach((sortParam) => {
    try {
      const [id, direction] = sortParam.split('-')
      sorting.push({
        id: id ?? '',
        desc: direction === 'desc',
      })
    } catch (error) {
      console.warn('Failed to parse sort parameter:', error)
    }
  })
  return sorting
}

/**
 * Converts sorting state to search params
 * @param sorting - The current sorting state
 * @param currentSearchParams - The current search params object
 * @returns URLSearchParams - The new search params object
 */
export function convertSortingToSearchParams(
  sorting: SortingState,
  currentSearchParams: URLSearchParams,
): URLSearchParams {
  const newSearchParams = new URLSearchParams(currentSearchParams)

  // Remove all existing sort parameters
  newSearchParams.delete('sort')

  // Add new sort parameters as separate 'sort' values
  sorting.forEach((sort) => {
    newSearchParams.append('sort', `${sort.id}-${sort.desc ? 'desc' : 'asc'}`)
  })

  return newSearchParams
}

/**
 * Reads pagination state from search params on initial load
 * @param searchParams - The URL search params object
 * @returns PaginationState - The pagination state object
 */
export function readPaginationFromSearchParams(
  searchParams: URLSearchParams,
): PaginationState {
  const pageFromUrl = searchParams.get('page')
  const pageSizeFromUrl = searchParams.get('pageSize')

  return {
    pageIndex: pageFromUrl ? parseInt(pageFromUrl, 10) - 1 : 0,
    pageSize: pageSizeFromUrl ? parseInt(pageSizeFromUrl, 10) : 10,
  }
}

/**
 * Converts pagination state to search params
 * @param pagination - The current pagination state
 * @param currentSearchParams - The current search params object
 * @param defaultPageSize - The default page size (defaults to 10)
 * @returns URLSearchParams - The new search params object
 */
export function convertPaginationToSearchParams(
  pagination: PaginationState,
  currentSearchParams: URLSearchParams,
  defaultPageSize = 10,
): URLSearchParams {
  const newSearchParams = new URLSearchParams(currentSearchParams)

  // Update page (1-indexed for URL, 0-indexed in state)
  if (pagination.pageIndex > 0) {
    newSearchParams.set('page', `${pagination.pageIndex + 1}`)
  } else {
    newSearchParams.delete('page')
  }

  // Update pageSize if not default
  if (pagination.pageSize !== defaultPageSize) {
    newSearchParams.set('pageSize', `${pagination.pageSize}`)
  } else {
    newSearchParams.delete('pageSize')
  }

  return newSearchParams
}
