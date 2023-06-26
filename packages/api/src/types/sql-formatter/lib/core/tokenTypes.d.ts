declare module 'sql-formatter/lib/core/tokenTypes' {
  interface TokenTypes {
    WORD: 'word'
    STRING: 'string'
    RESERVED: 'reserved'
    RESERVED_TOP_LEVEL: 'reserved-top-level'
    RESERVED_TOP_LEVEL_NO_INDENT: 'reserved-top-level-no-indent'
    RESERVED_NEWLINE: 'reserved-newline'
    OPERATOR: 'operator'
    OPEN_PAREN: 'open-paren'
    CLOSE_PAREN: 'close-paren'
    LINE_COMMENT: 'line-comment'
    BLOCK_COMMENT: 'block-comment'
    NUMBER: 'number'
    PLACEHOLDER: 'placeholder'
  }

  const tokenTypes: TokenTypes

  export default tokenTypes
}
