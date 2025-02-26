import * as z from 'zod'
import type { ConfigurationParameters } from '@stellariscloud/api-client'
import { Configuration } from '@stellariscloud/api-client'
import type { AxiosError, AxiosInstance, AxiosResponse } from 'axios'
import type { UseQueryOptions, UseQueryResult } from 'react-query'
import { safeZodParse } from '@stellariscloud/utils'

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
    safeZodParse(
      error.response.data,
      z.object({ errors: z.array(z.unknown()) }),
    )
  ) {
    return error.response.data.errors.filter(
      // eslint-disable-next-line @typescript-eslint/unbound-method
      (e) =>
        z
          .object({
            code: z.string().optional(),
            title: z.string().optional(),
            detail: z.string().optional(),
            pointer: z.string().optional(),
            meta: z.record(z.unknown(), z.string()).optional(),
          })
          .safeParse(e).success,
    )
  }

  return []
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
