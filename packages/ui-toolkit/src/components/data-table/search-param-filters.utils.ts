/**
 * Configuration for filter types
 */
export interface FilterConfig {
  /** Whether this filter is a search filter (single value) */
  isSearchFilter?: boolean
  /** The prefix to use for URL params (e.g., 'status' becomes 'status-') */
  paramPrefix?: string
}

/**
 * Reads filter values from search params on initial load
 * @param searchParams - The URL search params object
 * @param filterConfigs - Configuration for each filter type
 * @returns Record<string, string[]> - The filters object with arrays for each filter type
 */
export function readFiltersFromSearchParams(
  searchParams: URLSearchParams,
  filterConfigs: Record<string, FilterConfig>,
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
      filters[filterKey] = [
        ...searchParams
          .keys()
          .filter((k) => k.startsWith(`${prefix}-`))
          .map((k) => k.split('-').slice(1).join('-').toUpperCase()),
      ]
    }
  })

  return filters
}

/**
 * Merges filter updates into search params
 * @param newFilters - The new filters from the DataTable component
 * @param currentSearchParams - The current search params object
 * @param filterConfigs - Configuration for each filter type
 * @returns Record<string, string> - The new search params object
 */
export function convertFiltersToSearchParams(
  newFilters: Record<string, string[]>,
  currentSearchParams: URLSearchParams,
  filterConfigs: Record<string, FilterConfig>,
): Record<string, string> {
  const currentParams: Record<string, string> = {}
  currentSearchParams.forEach((value, key) => {
    currentParams[key] = value
  })

  // Start with all current params
  let resultParams = { ...currentParams }

  // Process each filter configuration
  Object.entries(filterConfigs).forEach(([filterKey, config]) => {
    if (config.isSearchFilter) {
      // Handle search filters
      if (filterKey in newFilters) {
        // Update or add search filter
        if (newFilters[filterKey].length > 0) {
          resultParams[filterKey] = newFilters[filterKey][0]
        } else {
          // Remove search filter if empty
          resultParams = Object.fromEntries(
            Object.entries(resultParams).filter(([key]) => key !== filterKey),
          )
        }
      } else {
        // Remove search filter if not in new filters
        resultParams = Object.fromEntries(
          Object.entries(resultParams).filter(([key]) => key !== filterKey),
        )
      }
    } else {
      // Handle dynamic filters
      const prefix = config.paramPrefix || filterKey

      // Remove all existing dynamic filter params for this filter type
      resultParams = Object.fromEntries(
        Object.entries(resultParams).filter(
          ([key]) => !key.startsWith(`${prefix}-`),
        ),
      )

      // Add new dynamic filter params if present in new filters
      if (filterKey in newFilters && newFilters[filterKey].length > 0) {
        newFilters[filterKey].forEach((value) => {
          resultParams[`${prefix}-${value.toLowerCase()}`] = 'true'
        })
      }
    }
  })

  return resultParams
}
