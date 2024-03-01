import type { ArgumentsHost, ExceptionFilter } from '@nestjs/common'
import { Catch, HttpException } from '@nestjs/common'
import type { Request, Response } from 'express'

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    // Get the response object from the arguments host
    const ctx = host.switchToHttp()
    const response = ctx.getResponse<Response>()

    // Get the request object from the arguments host
    const request = ctx.getRequest<Request>()

    // Get the status code from the exception
    const status = exception.getStatus()

    const serviceErrorKey =
      (exception as any).serviceErrorkey &&
      typeof (exception as any).serviceErrorkey === 'string'
        ? (exception as any).serviceErrorkey
        : undefined

    // Send a JSON response using the response object
    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      serviceErrorKey,
      message:
        exception.message ||
        exception.getResponse()['message'] ||
        'Internal Server Error',
    })
  }
}
