import React from 'react'

export const usePrevious = <T>(value: T): T | undefined => {
  const ref = React.useRef<T>()
  React.useEffect(() => {
    ref.current = value
  })
  return ref.current
}

export const useInterval = (
  callback: (end: () => void) => void,
  delay: number,
) => {
  const savedCallback = React.useRef<(end: () => void) => void>()

  React.useEffect(() => {
    savedCallback.current = callback
  }, [callback])

  React.useEffect(() => {
    let id: ReturnType<typeof setInterval> | undefined
    const clear = () => {
      if (id) {
        clearInterval(id)
      }
    }
    const tick = () => {
      if (savedCallback.current) {
        savedCallback.current(clear)
      }
    }
    if (delay > 0) {
      id = setInterval(tick, delay)
      return () => clear()
    }
  }, [delay])
}
