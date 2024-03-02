import type { ErrorObject } from 'ajv'
import Ajv from 'ajv'
import type { NextFunction, Request, Response } from 'express'
import { ValidationError } from 'express-openapi-validate'

import { HttpStatusCode } from '../constants/http.constants'
import type { ResponseError } from '../errors/http.error'
import { formatErrorCode } from '../util/i18n.util'

const formatErrors = (errors: Partial<ErrorObject>[]): ResponseError[] => {
  return errors.map((error) => {
    return {
      pointer: error.instancePath,
      meta: error.params,
      ...formatErrorCode(`validation.${error.keyword ?? 'error'}`, {
        ...error.params,
        context: error.params?.format,
        count: error.params?.limit,
      }),
    }
  })
}

export const validationErrorMiddleware = () => {
  return (error: unknown, req: Request, res: Response, next: NextFunction) => {
    if (error instanceof ValidationError) {
      return res
        .status(HttpStatusCode.UnprocessableEntity)
        .send({ errors: formatErrors(error.data) })
    }
    if (error instanceof Ajv.ValidationError) {
      return res
        .status(HttpStatusCode.UnprocessableEntity)
        .send({ errors: formatErrors(error.errors) })
    }
    next(error)
  }
}
