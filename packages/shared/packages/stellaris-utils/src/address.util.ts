export const randomHex = (len = 1) => {
  const result = []
  const characters = 'ABCDEFabcdef0123456789'
  for (let i = 0; i < len; i++) {
    result.push(
      characters.charAt(Math.floor(Math.random() * characters.length)),
    )
  }
  return result.join('')
}

export const generateDummyAddress = (
  containing = '',
  position: 'end' | 'start' | 'any' = 'any',
  caseSensitive = true,
): string[] => {
  const charsToFill = 40 - containing.length
  const prefixLength =
    position === 'start'
      ? 0
      : position === 'end'
      ? charsToFill
      : Math.floor(Math.random() * charsToFill)
  const suffixLength = charsToFill - prefixLength
  return [
    '0x',
    randomHex(prefixLength),
    caseSensitive
      ? containing
      : containing
          .split('')
          .map((v) =>
            Math.round(Math.random()) ? v.toUpperCase() : v.toLowerCase(),
          )
          .join(''),
    randomHex(suffixLength),
  ].filter((t) => t.length)
}
