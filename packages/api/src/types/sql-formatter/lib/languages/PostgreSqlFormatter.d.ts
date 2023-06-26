declare module 'sql-formatter/lib/languages/PostgreSqlFormatter' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  import { FormatOptions } from 'sql-formatter'
  import Formatter from 'sql-formatter/lib/core/Formatter'
  export default class PostgreSqlFormatter extends Formatter {}
}
