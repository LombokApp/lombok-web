import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  Logger,
} from '@nestjs/common'
import type { Request, Response } from 'express'

type LoggingMode = 'DEBUG' | 'NONE'
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  loggingMode: LoggingMode
  private readonly logger = new Logger(HttpExceptionFilter.name)
  constructor(loggingMode: LoggingMode = 'NONE') {
    this.loggingMode = loggingMode
  }
  catch(exception: HttpException, host: ArgumentsHost) {
    // Get the response object from the arguments host
    const ctx = host.switchToHttp()
    const response = ctx.getResponse<Response>()

    // Get the request object from the arguments host
    const request = ctx.getRequest<Request>()

    if (this.loggingMode === 'DEBUG') {
      this.logger.debug(
        'API EXCEPTION (%s %s):',
        request.method,
        request.url,
        JSON.stringify(exception, null, 2),
      )
    }

    // Get the status code from the exception
    const status =
      typeof exception.getStatus === 'function' ? exception.getStatus() : 500

    const exceptionResponse =
      typeof exception.getResponse === 'function'
        ? exception.getResponse()
        : undefined

    const serviceErrorKey =
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
      (exception as any).serviceErrorkey &&
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
      typeof (exception as any).serviceErrorkey === 'string'
        ? // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
          ((exception as any).serviceErrorkey as unknown)
        : undefined

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
