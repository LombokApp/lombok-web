import type { ConfigurationParameters } from '@stellariscloud/api-client'
import { Configuration } from '@stellariscloud/api-client'
import type { AxiosError, AxiosInstance, AxiosResponse } from 'axios'
import type { UseQueryOptions, UseQueryResult } from 'react-query'
import * as r from 'runtypes'

export const isAxiosError = (
  error: unknown,
): error is AxiosError & { response: AxiosResponse<unknown> } => {
  return (
    error instanceof Error &&
    (error as AxiosError).isAxiosError &&
    !!(error as AxiosError).response
  )
}

export const parseApiErrors = (error: unknown) => {
  if (
    isAxiosError(error) &&
    r.Record({ errors: r.Array(r.Unknown) }).guard(error.response.data)
  ) {
    return error.response.data.errors.filter(
      // eslint-disable-next-line @typescript-eslint/unbound-method
      r.Record({
        code: r.String.optional(),
        title: r.String.optional(),
        detail: r.String.optional(),
        pointer: r.String.optional(),
        meta: r.Dictionary(r.Unknown, r.String).optional(),
      }).guard,
    )
  }

  return []
}

export const parseValidationErrors = (error: unknown) => {
  const errors: any = {}

  for (const { code, meta, pointer } of parseApiErrors(error)) {
    if (code?.startsWith('validation.') && pointer?.startsWith('/body/')) {
      const parts = pointer.split('/').slice(2)

      if (typeof meta?.missingProperty === 'string') {
        parts.push(meta.missingProperty)
      }

      let current = errors

      for (let i = 0; i < parts.length - 1; i++) {
        if (current[parts[i]] === undefined) {
          current[parts[i]] = !isNaN(parseInt(parts[i + 1], 10)) ? [] : {}
        }
        current = current[parts[i]]
      }

      current[parts[parts.length - 1]] = code.replace(/^validation\./, '')
    }
  }

  return errors
}

export const bindApiConfig =
  <T>(
    defaults: ConfigurationParameters,
    Constructor: new (
      configuration: Configuration,
      _: undefined,
      axios?: AxiosInstance,
    ) => T,
    axiosInstance?: AxiosInstance,
  ) =>
  (_config?: ConfigurationParameters) =>
    new Constructor(
      new Configuration({ ...defaults, ..._config }),
      undefined,
      axiosInstance,
    )

export type UseApiQuery<TFn, TParams, TQueryFnData> = <TData = TQueryFnData>(
  requestParameters: TParams,
  options?: Omit<
    UseQueryOptions<TQueryFnData, Error, TData, [TFn, TParams]>,
    'queryKey' | 'queryFn'
  >,
) => UseQueryResult<TData>

export type ApiQueryHooks<T> = {
  [TFn in keyof T as `use${Capitalize<string & TFn>}`]: UseApiQuery<
    TFn,
    T[TFn] extends (requestParameters: infer TParams) => any ? TParams : never,
    T[TFn] extends (...args: any[]) => Promise<AxiosResponse<infer TData>>
      ? TData
      : never
  >
}
