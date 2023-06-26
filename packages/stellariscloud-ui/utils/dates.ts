export const timeSince = (date: Date) => {
  const now = Date.now()
  const deltaMs = Math.abs(now - date.getTime())
  const secondsAgo = Math.floor(deltaMs / 1000)
  if (secondsAgo < 10) {
    return 'Just now'
  } else if (secondsAgo < 60) {
    const t = Math.floor(deltaMs / 1000)
    return `${t} seconds ago`
  } else if (secondsAgo < 60 * 60) {
    const t = Math.floor(deltaMs / 1000 / 60)
    return `${t} ${t === 1 ? 'minute' : 'minutes'} ago`
  } else if (secondsAgo < 60 * 60 * 24) {
    const t = Math.floor(deltaMs / 1000 / 60 / 60)
    return `${t} ${t === 1 ? 'hour' : 'hours'} ago`
  }
  const t = Math.floor(deltaMs / 1000 / 60 / 60 / 24)
  return `${t} ${t === 1 ? 'day' : 'days'} ago`
}

export const dateStringToHumanReadable = (
  date: Date | string,
  options: Intl.DateTimeFormatOptions | undefined = undefined,
) => {
  const d = typeof date === 'string' ? new Date(date) : date
  const defaultOptions: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  } as const

  const dateStr = d.toLocaleDateString('en-US', {
    ...defaultOptions,
    ...options,
  })

  const timeSinceStr = timeSince(d)
  return `${dateStr} (${timeSinceStr})`
}
