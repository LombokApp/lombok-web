export function toQueryString(query: Record<string, string>) {
  const queryString = Object.entries(query)
    .map(([key, value]) => `${key}=${value}`)
    .join('&')
  return queryString ? `?${queryString}` : ''
}
