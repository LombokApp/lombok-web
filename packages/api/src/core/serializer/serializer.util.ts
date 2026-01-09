import type {
  CallHandler,
  ExecutionContext,
  NestInterceptor,
} from '@nestjs/common'
import { BadRequestException, Injectable, StreamableFile } from '@nestjs/common'
import type { Controller } from '@nestjs/common/interfaces'
import type { Observable } from 'rxjs'
import { map } from 'rxjs'
import type { ZodArray, ZodObject, ZodTypeAny } from 'zod'
import { z } from 'zod'

import nestJSMetadataLoader from '../../nestjs-metadata'
import { createZodSerializationException } from './exception'

@Injectable()
export class ZodSerializerInterceptor implements NestInterceptor {
  nestJSMetadata = nestJSMetadataLoader()
  controllers: Record<string, Controller> = {}
  initialized = false

  constructor() {
    void this.init()
  }

  async init() {
    if (this.initialized) {
      return
    }
    const loadedMetadata = await this.nestJSMetadata
    for (const c of loadedMetadata['@nestjs/swagger'].controllers) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const c1 = c[1]!
      for (const controllerName of Object.keys(c1)) {
        this.controllers[controllerName] = Object.keys(
          // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
          c1[controllerName],
        ).reduce(
          (acc, handlerName) => ({
            ...acc,
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
            [handlerName]: c1[controllerName][handlerName],
          }),
          {},
        )
      }
    }
    this.initialized = true
  }

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ): Promise<Observable<any>> {
    await this.init()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    type ZodObjectAny = ZodObject<any>

    return next.handle().pipe(
      map((res: object | object[]) => {
        const cls = context.getClass()
        const handler = context.getHandler()
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const handlerDefinition: { type: unknown } | undefined =
          this.controllers[cls.name]?.[handler.name]

        if (typeof res !== 'object' || res instanceof StreamableFile) {
          return res
        }

        const responseType = handlerDefinition?.type

        if (!responseType) {
          return res
        }
        const schema: ZodObjectAny | ZodArray<ZodTypeAny> | undefined =
          typeof responseType === 'function' && 'zodSchema' in responseType
            ? (responseType.zodSchema as ZodObjectAny | ZodArray<ZodTypeAny>)
            : undefined
        if (!schema) {
          return res
        }

        try {
          // If schema is an array schema, parse the whole response
          if (schema instanceof z.ZodArray) {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-return
            return schema.parse(res)
          }
          // If response is an array but schema is an object, map over items
          if (Array.isArray(res)) {
            return res.map((item: unknown) => schema.parse(item))
          }
          // Otherwise, parse directly
          return schema.parse(res)
        } catch (error) {
          if (error instanceof z.ZodError) {
            throw new BadRequestException(
              createZodSerializationException(error),
            )
          }
          throw error
        }
      }),
    )
  }
}
