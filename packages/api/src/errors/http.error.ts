import type { Response } from 'express'
import express from 'express'
import * as r from 'runtypes'

import type { HttpStatusCode } from '../constants/http.constants'

/**
 * Error objects provide additional information about problems encountered while
 * performing an operation. Error objects MUST be returned as an array keyed by
 * errors in the top level of the response document.
 */
export interface ResponseError {
  /**
   * A unique identifier for this particular occurrence of the problem.
   */
  id?: string

  /**
   * An application-specific error code, expressed as a string value.
   */
  code?: string

  /**
   * A short, human-readable summary of the problem that SHOULD NOT change from
   * occurrence to occurrence of the problem, except for purposes of
   * localization.
   */
  title?: string

  /**
   * A human-readable explanation specific to this occurrence of the problem.
   * Like `title`, this field’s value can be localized
   */
  detail?: string

  /**
   * A JSON Pointer [RFC6901] to the associated entity in the request.
   */
  pointer?: string

  /**
   * A meta object containing non-standard meta-information about the error.
   */
  meta?: Record<string, any>
}

const ResponseErrorType = r.Partial({
  id: r.String,
  code: r.String,
  title: r.String,
  detail: r.String,
  pointer: r.String,
  meta: r.Dictionary(r.Unknown),
})

// eslint-disable-next-line @typescript-eslint/no-unsafe-declaration-merging
export class HttpError extends Error {
  name = HttpError.name

  static readonly status: unique symbol = Symbol('HttpError.status')
  static readonly errors: unique symbol = Symbol('HttpError.errors')

  constructor(status: HttpStatusCode, errors: ResponseError[]) {
    super()
    this[HttpError.status] = status
    this[HttpError.errors] = errors
  }

  static parse(error: unknown) {
    // eslint-disable-next-line @typescript-eslint/no-use-before-define
    return HttpErrorType.validate(error)
  }
}

export interface HttpErrorLike {
  [HttpError.status]: HttpStatusCode
  [HttpError.errors]?: ResponseError[]
}

// eslint-disable-next-line @typescript-eslint/no-unsafe-declaration-merging
export interface HttpError extends HttpErrorLike {}

const HttpErrorType: r.Runtype<HttpErrorLike> = r.InstanceOf(HttpError).Or(
  r.Record({
    [HttpError.status]: r.Number,
    [HttpError.errors]: r.Array(ResponseErrorType).optional(),
  }),
)

function responseError(this: Response, error: HttpErrorLike) {
  return this.status(error[HttpError.status]).json({
    errors: error[HttpError.errors],
  })
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    export interface Response {
      error: typeof responseError
    }
  }
}

express.response.error = responseError
