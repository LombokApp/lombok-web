import type {
  CallHandler,
  ExecutionContext,
  NestInterceptor,
} from '@nestjs/common'
import { Injectable, StreamableFile } from '@nestjs/common'
import type { Controller } from '@nestjs/common/interfaces'
import type { Observable } from 'rxjs'
import { map } from 'rxjs'
import type { ZodObject } from 'zod'
import { z } from 'zod'

import nestJSMetadataLoader from '../../nestjs-metadata'
import { createZodSerializationException } from './exception'

@Injectable()
export class ZodSerializerInterceptor implements NestInterceptor {
  nestJSMetadata = nestJSMetadataLoader()
  controllers: { [key: string]: Controller } = {}
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
      for (const controllerName of Object.keys(c[1])) {
        this.controllers[controllerName] = Object.keys(
          // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
          c[1][controllerName],
        ).reduce(
          (acc, handlerName) => ({
            ...acc,
            [handlerName]: c[1][controllerName][handlerName],
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
  ): Promise<Observable<any>> {
    await this.init()
    return next.handle().pipe(
      map((res: object | object[]) => {
        const cls = context.getClass()
        const handler = context.getHandler()
        const handlerDefinition: { type: any } | undefined =
          this.controllers[cls.name][handler.name]

        if (typeof res !== 'object' || res instanceof StreamableFile) {
          return res
        }

        const responseType = handlerDefinition?.type
        if (!responseType) {
          return res
        }

        const schema: ZodObject<any> | undefined = responseType.zodSchema
        if (!schema) {
          return res
        }

        try {
          return Array.isArray(res)
            ? res.map((item: any) => schema.parse(item))
            : schema.parse(res)
        } catch (error) {
          if (error instanceof z.ZodError) {
            throw createZodSerializationException(error)
          }
          throw error
        }
      }),
    )
  }
}
