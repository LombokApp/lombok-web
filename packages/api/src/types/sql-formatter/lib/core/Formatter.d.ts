declare module 'sql-formatter/lib/core/Formatter' {
  import type { FormatOptions } from 'sql-formatter'
  import type Tokenizer, { Token } from 'sql-formatter/lib/core/Tokenizer'

  export default class Formatter {
    constructor(cfg: FormatOptions)
    tokenizer(): Tokenizer
    tokenOverride(token: Token): Token
    format(query: string): string
    getFormattedQueryFromTokens(): string
    formatLineComment(token: Token, query: string): string
    formatBlockComment(token: Token, query: string): string
    indentComment(comment: string): string
    formatTopLevelReservedWordNoIndent(token: Token, query: string): string
    formatTopLevelReservedWord(token: Token, query: string): string
    equalizeWhitespace(string: string): string
    formatOpeningParentheses(token: Token, query: string): string
    formatClosingParentheses(token: Token, query: string): string
    formatPlaceholder(token: Token, query: string): string
    formatComma(token: Token, query: string): string
    formatWithSpaceAfter(token: Token, query: string): string
    formatWithoutSpaces(token: Token, query: string): string
    formatWithSpaces(token: Token, query: string): string
    formatQuerySeparator(token: Token, query: string): string
    show(token: Token): string
    addNewline(query: string): string
    tokenLookBehind(n: number): Token | undefined
    tokenLookAhead(n: number): Token | undefined
  }
}
