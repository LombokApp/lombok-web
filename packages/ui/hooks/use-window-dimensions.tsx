import React from 'react'

export const getWindowSize = () => {
  const w =
    typeof window === 'undefined'
      ? { innerHeight: 0, innerWidth: 0, scrollHeight: 0 }
      : window
  return {
    innerWidth: w.innerWidth === 0 ? 1 : w.innerWidth,
    innerHeight: w.innerHeight === 0 ? 1 : w.innerHeight,
    scrollHeight:
      document.body.scrollHeight === 0 ? 1 : document.body.scrollHeight,
  }
}

export const useWindowDimensions = () => {
  const [windowSize, setWindowSize] = React.useState({
    innerHeight: 0,
    innerWidth: 0,
    scrollHeight: 0,
  })

  React.useEffect(() => {
    function handleWindowResize() {
      const newSize = getWindowSize()
      setWindowSize(newSize)
    }

    window.addEventListener('resize', handleWindowResize)

    setTimeout(() => handleWindowResize())

    return () => {
      window.removeEventListener('resize', handleWindowResize)
    }
  }, [])
  return windowSize
}
