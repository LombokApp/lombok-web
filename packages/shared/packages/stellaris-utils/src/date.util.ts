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
