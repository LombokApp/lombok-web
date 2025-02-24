export async function injectIntoHead(html: string, toInject: string) {
  // find the exact position to inject the script (start of the <head> block)
  let insertPosition = -1
  let currentTag: string = ''
  let inTag: number = -1
  for (let i = 0; i < html.length; i++) {
    const char = html[i]
    if (char === '<' && html[i + 1] !== '/') {
      inTag = i
    } else if (inTag > -1 && char === '>') {
      currentTag = html
        .slice(inTag + 1, i)
        .split(' ')[0]
        .trim()
      inTag = -1
    }
    if (currentTag === 'head') {
      insertPosition = i + 1
      break
    }
  }

  return insertPosition > -1
    ? `${html.slice(0, insertPosition)}${toInject}${html.slice(insertPosition)}`
    : undefined
}
