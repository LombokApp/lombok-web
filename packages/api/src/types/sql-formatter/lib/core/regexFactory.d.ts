declare module 'sql-formatter/lib/core/regexFactory' {
  export function createOperatorRegex(multiLetterOperators: string[]): RegExp
  export function createLineCommentRegex(lineCommentTypes: string[]): RegExp
  export function createReservedWordRegex(reservedWords: string[]): RegExp
  export function createWordRegex(specialChar: string[]): RegExp
  export function createStringRegex(stringTypes: string[]): RegExp
  export function createStringPattern(stringTypes: string[]): string
  export function createParenRegex(parens: string[]): RegExp
  export function createPlaceholderRegex(
    types: string[],
    pattern: string,
  ): RegExp
}
