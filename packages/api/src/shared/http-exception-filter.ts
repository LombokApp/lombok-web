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

    console.log(
      'API EXCEPTION (%s):',
      request.url,
      JSON.stringify(exception, null, 2),
    )

    // Get the status code from the exception
    const status = exception.getStatus()

    const serviceErrorKey =
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
      (exception as any).serviceErrorkey &&
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
      typeof (exception as any).serviceErrorkey === 'string'
        ? // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
          ((exception as any).serviceErrorkey as unknown)
        : undefined

    const exceptionResponse = exception.getResponse()
    const responseMessage: string | undefined =
      typeof exceptionResponse === 'object' && 'message' in exceptionResponse
        ? (exceptionResponse['message'] as string)
        : undefined
    // Send a JSON response using the response object
    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      serviceErrorKey,
      message: responseMessage || 'Internal Server Error',
    })
  }
}
