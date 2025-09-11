import { applyDecorators } from '@nestjs/common'
import { ApiResponse } from '@nestjs/swagger'
import { ApiErrorResponseDTO } from 'src/platform/dto/api-error-response.dto'

export function ApiStandardErrorResponses() {
  return applyDecorators(
    ApiResponse({
      status: '5XX',
      description: 'Server Error',
      type: ApiErrorResponseDTO,
    }),
    ApiResponse({
      status: '4XX',
      description: 'Client Error',
      type: ApiErrorResponseDTO,
    }),
  )
}
