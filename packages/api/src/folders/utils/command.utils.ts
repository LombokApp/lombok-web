import * as r from 'runtypes'

export enum ContractDeployerCommandName {
  SEARCH = 'SEARCH',
}

export const SearchCommandRunType = r.Record({
  name: r.Literal(ContractDeployerCommandName.SEARCH),
  payload: r.Record({
    contractId: r.String,
    searchTerms: r.Array(
      r.Record({
        term: r.String,
        position: r.Union(
          r.Literal('start'),
          r.Literal('end'),
          r.Literal('any'),
        ),
        caseSensitive: r.Boolean,
      }),
    ),
  }),
})

export enum SearchTermPosition {
  Start = 'start',
  End = 'end',
  Any = 'any',
}

export interface SearchTerm {
  position: SearchTermPosition
  term: string
  caseSensitive: boolean
}
