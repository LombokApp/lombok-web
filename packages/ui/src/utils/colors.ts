export const stringToColour = (str: string) => {
  let hash = 0
  str.split('').forEach((char) => {
    hash = char.charCodeAt(0) + ((hash << 5) - hash)
  })
  let colour = '#'
  for (let i = 0; i < 3; i++) {
    const value = (hash >> (i * 8)) & 0xff
    colour += value.toString(16).padStart(2, '0')
  }
  return colour
}

function padZero(str: string, len = 2) {
  const zeros = new Array(len).join('0')
  return (zeros + str).slice(-len)
}

export function invertColour(hex: string, bw = true) {
  let _hex = hex
  if (_hex.startsWith('#')) {
    _hex = _hex.slice(1)
  }
  // convert 3-digit hex to 6-digits.
  if (hex.length === 3) {
    _hex =
      (_hex[0] ?? '') +
      (_hex[0] ?? '') +
      (_hex[1] ?? '') +
      (_hex[1] ?? '') +
      (_hex[2] ?? '') +
      (_hex[2] ?? '')
  }
  if (_hex.length !== 6) {
    throw new Error('Invalid HEX color.')
  }
  const r = parseInt(_hex.slice(0, 2), 16),
    g = parseInt(_hex.slice(2, 4), 16),
    b = parseInt(_hex.slice(4, 6), 16)
  if (bw) {
    // https://stackoverflow.com/a/3943023/112731
    return r * 0.299 + g * 0.587 + b * 0.114 > 186 ? '#000000' : '#FFFFFF'
  }
  // invert color components
  // pad each with zeros and return
  return `#${padZero((255 - r).toString(16))}${padZero((255 - g).toString(16))}${padZero((255 - b).toString(16))}`
}
