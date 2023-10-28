export const addDays = (date: Date, days: number) => {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

export const addSeconds = (date: Date, seconds: number) => {
  const result = new Date(date)
  result.setSeconds(result.getSeconds() + seconds)
  return result
}

export const addMs = (date: Date, ms: number) => {
  const result = new Date(date)
  result.setTime(result.getTime() + ms)
  return result
}

export const latest = (...dates: Date[]) => {
  return dates.reduce((a, b) => (a.getDate() >= b.getDate() ? a : b))
}

export const earliest = (...dates: Date[]) => {
  return dates.reduce((a, b) => (a.getDate() <= b.getDate() ? a : b))
}

export const timeSinceOrUntil = (date: Date) => {
  const now = Date.now()
  const deltaMs = now - date.getTime()
  const invert = deltaMs < 0
  const deltaMsAbs = Math.abs(deltaMs)
  const secondsAgo = Math.floor(deltaMsAbs / 1000)
  if (secondsAgo < 10) {
    return invert ? 'Any second now' : 'Just now'
  } else if (secondsAgo < 60) {
    const t = Math.floor(deltaMsAbs / 1000)
    return invert ? `in ${t} seconds` : `${t} seconds ago`
  } else if (secondsAgo < 60 * 60) {
    const t = Math.floor(deltaMsAbs / 1000 / 60)
    return invert
      ? `in ${t} ${t === 1 ? 'minute' : 'minutes'}`
      : `${t} ${t === 1 ? 'minute' : 'minutes'} ago`
  } else if (secondsAgo < 60 * 60 * 24) {
    const t = Math.floor(deltaMsAbs / 1000 / 60 / 60)
    return invert
      ? `in ${t} ${t === 1 ? 'hour' : 'hours'}`
      : `${t} ${t === 1 ? 'hour' : 'hours'} ago`
  }
  const t = Math.floor(deltaMsAbs / 1000 / 60 / 60 / 24)
  return invert
    ? `in ${t} ${t === 1 ? 'day' : 'days'}`
    : `${t} ${t === 1 ? 'day' : 'days'} ago`
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

  const timeSinceStr = timeSinceOrUntil(d)
  return `${dateStr} (${timeSinceStr})`
}
