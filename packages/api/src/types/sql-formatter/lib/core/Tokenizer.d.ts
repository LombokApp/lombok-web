declare module 'sql-formatter/lib/core/Tokenizer' {
  export interface Token {
    type: string
    value: string
    key?: string
  }

  export default class Tokenizer {
    WHITESPACE_REGEX: RegExp
    NUMBER_REGEX: RegExp
    OPERATOR_REGEX: RegExp
    BLOCK_COMMENT_REGEX: RegExp
    LINE_COMMENT_REGEX: RegExp
    RESERVED_TOP_LEVEL_REGEX: RegExp
    RESERVED_TOP_LEVEL_NO_INDENT_REGEX: RegExp
    RESERVED_NEWLINE_REGEX: RegExp
    RESERVED_PLAIN_REGEX: RegExp
    WORD_REGEX: RegExp
    STRING_REGEX: RegExp
    OPEN_PAREN_REGEX: RegExp
    CLOSE_PAREN_REGEX: RegExp
    INDEXED_PLACEHOLDER_REGEX: RegExp
    IDENT_NAMED_PLACEHOLDER_REGEX: RegExp
    STRING_NAMED_PLACEHOLDER_REGEX: RegExp
    tokenize(input: string): Token[]
    getWhitespace(input: string): string
    getNextToken(input: string, previousToken?: Token): Token | undefined
    getCommentToken(input: string): Token | undefined
    getLineCommentToken(input: string): Token | undefined
    getBlockCommentToken(input: string): Token | undefined
    getStringToken(input: string): Token | undefined
    getOpenParenToken(input: string): Token | undefined
    getCloseParenToken(input: string): Token | undefined
    getPlaceholderToken(input: string): Token | undefined
    getIdentNamedPlaceholderToken(input: string): Token | undefined
    getStringNamedPlaceholderToken(input: string): Token | undefined
    getIndexedPlaceholderToken(input: string): Token | undefined
    getPlaceholderTokenWithKey(cfg: {
      input: string
      regex: RegExp
      parseKey: (value: string) => string
    }): Token | undefined
    getEscapedPlaceholderKey(cfg: { key: string; quoteChar: string }): string
    getNumberToken(input: string): Token | undefined
    getReservedWordToken(
      input: string,
      previousToken?: Token,
    ): Token | undefined
    getTopLevelReservedToken(input: string): Token | undefined
    getNewlineReservedToken(input: string): Token | undefined
    getTopLevelReservedTokenNoIndent(input: string): Token | undefined
    getPlainReservedToken(input: string): Token | undefined
    getWordToken(input: string): Token | undefined
    getTokenOnFirstMatch(cfg: { input: string; type: string; regex: RegExp })
  }
}
