import type {
  CallHandler,
  ExecutionContext,
  NestInterceptor,
} from '@nestjs/common'
import { Inject, Injectable, SetMetadata, StreamableFile } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import type { Observable } from 'rxjs'
import { map } from 'rxjs'
import type { ZodSchema, ZodTypeDef } from 'zod'

import nestJSMetadataLoader from '../../nestjs-metadata'
import { createZodSerializationException } from './exception'

// NOTE (external)
// We need to deduplicate them here due to the circular dependency
// between core and common packages

export const ZodSerializerDtoOptions = 'ZOD_SERIALIZER_DTO_OPTIONS' as const

const nestJSMetadataPromise = nestJSMetadataLoader()

// export const ZodSerializerDto = (dto: ZodDto | ZodSchema) =>
//   SetMetadata(ZodSerializerDtoOptions, dto)

// export function validate<
//   TOutput = any,
//   TDef extends ZodTypeDef = ZodTypeDef,
//   TInput = TOutput,
// >(
//   value: unknown,
//   schemaOrDto:
//     | ZodSchema<TOutput, TDef, TInput>
//     | ZodDtoStatic<TOutput, TDef, TInput>,
//   createValidationException: ZodExceptionCreator = createZodValidationException,
// ) {
//   const schema = isZodDto(schemaOrDto) ? schemaOrDto.schema : schemaOrDto

//   const result = schema.safeParse(value)

//   if (!result.success) {
//     throw createValidationException(result.error)
//   }

//   return result.data
// }

@Injectable()
export class ZodSerializerInterceptor implements NestInterceptor {
  constructor(readonly reflector: Reflector) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    // const responseSchema = this.getContextResponseSchema(context)
    const responseSchema = '' as string
    const nestJSMetadata = await nestJSMetadataPromise
    return next.handle().pipe(
      map((res: object | object[]) => {
        console.log('ZodSerializerInterceptor res:', res, next)

        // const responseTypeMetadata = this.reflector.getAll(
        //   'swagger/apiResponse',
        //   [context.getHandler(), context.getArgByIndex(0)],
        // )
        // const handler = context.getHandler()
        const clz = context.getClass()
        // const classMetadataKeys = Reflect.getMetadataKeys(clz)
        // const handlerMetadataKeys = Reflect.getMetadataKeys(handler)
        console.log('nestJSMetadata controller class:', clz)
        // console.log(
        //   'nestJSMetadata controller class (match):',
        //   nestJSMetadata['@nestjs/swagger'].controllers.find((c) => c === clz),
        // )
        console.log('nestJSMetadata:', nestJSMetadata)

        if (!responseSchema) {
          return res
        }

        if (typeof res !== 'object' || res instanceof StreamableFile) {
          return res
        }

        return res
        // return Array.isArray(res)
        //   ? res.map((item) =>
        //       validate(item, responseSchema, createZodSerializationException),
        //     )
        //   : validate(res, responseSchema, createZodSerializationException)
      }),
    )
  }

  // protected getContextResponseSchema(
  //   context: ExecutionContext,
  // ): ZodDto | ZodSchema | undefined {
  //   return this.reflector.getAllAndOverride(ZodSerializerDtoOptions, [
  //     context.getHandler(),
  //     context.getClass(),
  //   ])
  // }
}
