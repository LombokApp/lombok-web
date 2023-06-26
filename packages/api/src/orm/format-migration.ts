import type { Transform } from 'jscodeshift'
import {
  createOperatorRegex,
  createParenRegex,
} from 'sql-formatter/lib/core/regexFactory'
import type { Token } from 'sql-formatter/lib/core/Tokenizer'
import tokenTypes from 'sql-formatter/lib/core/tokenTypes'
import BasePostgreSqlFormatter from 'sql-formatter/lib/languages/PostgreSqlFormatter'

const BASE_OPERATORS = [
  // https://github.com/zeroturnaround/sql-formatter/blob/3cd6d98/src/core/Tokenizer.js#L26-L28
  '<>',
  '<=',
  '>=',
  // https://github.com/zeroturnaround/sql-formatter/blob/3cd6d98/src/languages/PostgreSqlFormatter.js#L516-L532
  '!=',
  '<<',
  '>>',
  '||/',
  '|/',
  '::',
  '->>',
  '->',
  '~~*',
  '~~',
  '!~~*',
  '!~~',
  '~*',
  '!~*',
  '!~',
  '!!',
]

class PostgreSqlFormatter extends BasePostgreSqlFormatter {
  tokenizer() {
    const tokenizer = super.tokenizer()
    tokenizer.OPERATOR_REGEX = createOperatorRegex([
      ...BASE_OPERATORS,
      '||',
      ':=',
    ])

    // https://github.com/zeroturnaround/sql-formatter/blob/3cd6d98/src/languages/PostgreSqlFormatter.js#L511
    tokenizer.OPEN_PAREN_REGEX = createParenRegex(['(', '[', 'CASE'])
    tokenizer.CLOSE_PAREN_REGEX = createParenRegex([')', ']', 'END'])

    return tokenizer
  }

  tokenOverride(token: Token) {
    if (
      token.type === tokenTypes.STRING &&
      // eslint-disable-next-line regexp/optimal-quantifier-concatenation, regexp/no-super-linear-backtracking
      /^\$\$\s+BEGIN\s+[\s\S]*\s+END\s+\$\$$/.test(token.value)
    ) {
      token.value = `$$
BEGIN
${this.format(token.value.replace(/^\$\$\s+BEGIN\s+|\s+END\s+\$\$$/g, ''))}
END
$$`
    }

    return token
  }
}

const formatter = new PostgreSqlFormatter({ uppercase: true })

const transform: Transform = (file, api, _options) => {
  return api
    .j(file.source)
    .find(api.j.CallExpression, { callee: { property: { name: 'addSql' } } })
    .forEach((node) => {
      if (node.value.arguments.length !== 1) {
        return
      }

      const [arg] = node.value.arguments

      const indent = node.value.loc?.start.column

      if (
        arg.type === 'StringLiteral' ||
        (arg.type === 'TemplateLiteral' && arg.expressions.length === 0)
      ) {
        const value =
          arg.type === 'StringLiteral'
            ? arg.value
            : arg.quasis[0].value.cooked ?? arg.quasis[0].value.raw

        let lines = formatter.format(value).split('\n')

        if (lines.length > 1 && indent !== undefined) {
          lines = lines.map((line) => ' '.repeat(indent + 2) + line)

          lines.unshift('')
          lines.push(' '.repeat(indent))
        }

        const formatted = lines.join('\n')

        node.value.arguments = [
          api.j.templateLiteral(
            [
              api.j.templateElement(
                { cooked: formatted, raw: formatted },
                true,
              ),
            ],
            [],
          ),
        ]
      }
    })
    .toSource()
}

export default transform
export const parser = 'ts'
