import type { SearchTerm } from './command.utils'

export const createRegex = (searchTerm: SearchTerm): string => {
  let termGroup = searchTerm.term
  if (!searchTerm.caseSensitive) {
    termGroup = termGroup
      .split('')
      .map((v) =>
        // If its an alphabetical character, we want to find both the upper
        // and lower case value in the regex. ECMAScript doesn't have the (?i)
        // modifier in regex and we want to share the regex between languages.
        /[a-z]/i.test(v) ? `[${v.toLowerCase()}${v.toUpperCase()}]` : v,
      )
      .join('')
  }

  termGroup = `(${termGroup})`
  if (searchTerm.position === 'start') {
    termGroup = '^0x' + termGroup
  }

  if (searchTerm.position === 'end') {
    termGroup = termGroup + '$'
  }

  return termGroup
}
