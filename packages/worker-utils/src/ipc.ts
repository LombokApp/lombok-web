import {
  appManifestSchema,
  contentMetadataSchema,
  folderObjectSchema,
  getContentSignedUrlsSchema,
  getMetadataSignedUrlsSchema,
  taskDTOSchema,
} from '@lombokapp/types'
import type { Variant } from '@lombokapp/utils'
import { z } from 'zod'

import { errorEnvelopeSchema } from './errors/work-errors.types'

export const createResponseSchema = <T extends z.ZodTypeAny>(resultSchema: T) =>
  z.discriminatedUnion('success', [
    z.object({
      success: z.literal(true),
      result: resultSchema,
    }),
    z.object({
      success: z.literal(false),
      error: errorEnvelopeSchema,
    }),
  ])

export const coreWorkerMessagePayloadSchemas = {
  get_worker_exec_config: {
    request: z.object({
      appIdentifier: z.string(),
      workerIdentifier: z.string(),
    }),
    response: createResponseSchema(
      z.object({
        payloadUrl: z.string(),
        workerToken: z.string(),
        environmentVariables: z.record(z.string(), z.string()),
        entrypoint: z.string(),
        hash: z.string(),
      }),
    ),
  },
  get_ui_bundle: {
    request: z.object({
      appIdentifier: z.string(),
    }),
    response: createResponseSchema(
      z.object({
        uiHash: z.string(),
        manifest: appManifestSchema,
        bundleUrl: z.string(),
        csp: z.string().optional(),
      }),
    ),
  },
  init: {
    request: z.object({
      instanceId: z.string(),
      appUiHashMapping: z.record(z.string(), z.string()),
      appWorkerHashMapping: z.record(z.string(), z.string()),
      serverBaseUrl: z.string().optional(),
      executionOptions: z
        .object({
          printWorkerOutput: z.boolean().optional(),
          removeWorkerDirectory: z.boolean().optional(),
          printNsjailVerboseOutput: z.boolean().optional(),
        })
        .optional(),
    }),
    response: createResponseSchema(z.null()),
  },
  update_app_hash_mapping: {
    request: z.object({
      appUiHashMapping: z.record(z.string(), z.string()),
      appWorkerHashMapping: z.record(z.string(), z.string()),
    }),
    response: createResponseSchema(z.null()),
  },
  analyze_object: {
    request: z.object({
      folderId: z.string().nonempty(),
      objectKey: z.string().nonempty(),
    }),
    response: createResponseSchema(
      z.object({
        contentHash: z.string(),
        contentMetadata: contentMetadataSchema,
      }),
    ),
  },
  get_metadata_signed_urls: {
    request: getMetadataSignedUrlsSchema,
    response: createResponseSchema(
      z.array(
        z.object({
          folderId: z.string(),
          objectKey: z.string(),
          url: z.string(),
        }),
      ),
    ),
  },
  get_folder_object: {
    request: z.object({
      folderId: z.string().nonempty(),
      objectKey: z.string().nonempty(),
    }),
    response: createResponseSchema(folderObjectSchema),
  },
  get_content_signed_urls: {
    request: getContentSignedUrlsSchema,
    response: createResponseSchema(
      z.array(
        z.object({
          url: z.string(),
        }),
      ),
    ),
  },
  execute_task: {
    request: z.object({
      task: taskDTOSchema,
      appIdentifier: z.string(),
      workerIdentifier: z.string(),
    }),
    response: createResponseSchema(z.null()),
  },
  execute_system_request: {
    request: z.object({
      appIdentifier: z.string(),
      workerIdentifier: z.string(),
      request: z.object({
        url: z.string().startsWith('/'),
        method: z.string(),
        headers: z.record(z.string(), z.string()),
        body: z.string(),
      }),
    }),
    response: createResponseSchema(
      z.object({
        status: z.number(),
        statusText: z.string(),
        headers: z.record(z.string(), z.string()),
        body: z.string().optional(),
      }),
    ),
  },
}

export type ServerlessWorkerExecConfig = Variant<
  typeof coreWorkerMessagePayloadSchemas.get_worker_exec_config.response,
  'success',
  true
>['result']

export type AppUiBundle = Variant<
  typeof coreWorkerMessagePayloadSchemas.get_ui_bundle.response,
  'success',
  true
>['result']

export type CoreWorkerMessagePayloadTypes = {
  [K in keyof typeof coreWorkerMessagePayloadSchemas]: {
    request: z.infer<(typeof coreWorkerMessagePayloadSchemas)[K]['request']>
    response: z.infer<(typeof coreWorkerMessagePayloadSchemas)[K]['response']>
  }
}

export type SystemRequestResult = Variant<
  typeof coreWorkerMessagePayloadSchemas.execute_system_request.response,
  'success',
  true
>['result']

export const coreWorkerIncomingResponseMessageSchema = z.discriminatedUnion(
  'action',
  [
    z.object({
      action: z.literal('get_content_signed_urls'),
      payload: coreWorkerMessagePayloadSchemas.get_content_signed_urls.response,
    }),
    z.object({
      action: z.literal('get_metadata_signed_urls'),
      payload:
        coreWorkerMessagePayloadSchemas.get_metadata_signed_urls.response,
    }),
    z.object({
      action: z.literal('get_folder_object'),
      payload: coreWorkerMessagePayloadSchemas.get_folder_object.response,
    }),
    z.object({
      action: z.literal('get_worker_exec_config'),
      payload: coreWorkerMessagePayloadSchemas.get_worker_exec_config.response,
    }),
    z.object({
      action: z.literal('get_ui_bundle'),
      payload: coreWorkerMessagePayloadSchemas.get_ui_bundle.response,
    }),
  ],
)

export const coreWorkerIncomingRequestMessageSchema = z.discriminatedUnion(
  'action',
  [
    z.object({
      action: z.literal('init'),
      payload: coreWorkerMessagePayloadSchemas.init.request,
    }),
    z.object({
      action: z.literal('analyze_object'),
      payload: coreWorkerMessagePayloadSchemas.analyze_object.request,
    }),
    z.object({
      action: z.literal('update_app_hash_mapping'),
      payload: coreWorkerMessagePayloadSchemas.update_app_hash_mapping.request,
    }),
    z.object({
      action: z.literal('execute_task'),
      payload: coreWorkerMessagePayloadSchemas.execute_task.request,
    }),
    z.object({
      action: z.literal('execute_system_request'),
      payload: coreWorkerMessagePayloadSchemas.execute_system_request.request,
    }),
  ],
)

export const coreWorkerOutgoingResponseMessageSchema = z.discriminatedUnion(
  'action',
  [
    z.object({
      action: z.literal('init'),
      payload: coreWorkerMessagePayloadSchemas.init.response,
    }),
    z.object({
      action: z.literal('update_app_hash_mapping'),
      payload: coreWorkerMessagePayloadSchemas.update_app_hash_mapping.response,
    }),
    z.object({
      action: z.literal('analyze_object'),
      payload: coreWorkerMessagePayloadSchemas.analyze_object.response,
    }),
    z.object({
      action: z.literal('execute_task'),
      payload: coreWorkerMessagePayloadSchemas.execute_task.response,
    }),
    z.object({
      action: z.literal('execute_system_request'),
      payload: coreWorkerMessagePayloadSchemas.execute_system_request.response,
    }),
  ],
)

export const coreWorkerOutgoingRequestMessageSchema = z.discriminatedUnion(
  'action',
  [
    z.object({
      action: z.literal('get_worker_exec_config'),
      payload: coreWorkerMessagePayloadSchemas.get_worker_exec_config.request,
    }),
    z.object({
      action: z.literal('get_metadata_signed_urls'),
      payload: coreWorkerMessagePayloadSchemas.get_metadata_signed_urls.request,
    }),
    z.object({
      action: z.literal('get_folder_object'),
      payload: coreWorkerMessagePayloadSchemas.get_folder_object.request,
    }),
    z.object({
      action: z.literal('get_content_signed_urls'),
      payload: coreWorkerMessagePayloadSchemas.get_content_signed_urls.request,
    }),
    z.object({
      action: z.literal('get_ui_bundle'),
      payload: coreWorkerMessagePayloadSchemas.get_ui_bundle.request,
    }),
  ],
)

export const coreWorkerOutgoingIpcMessageSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('response'),
    id: z.string(),
    payload: coreWorkerOutgoingResponseMessageSchema,
  }),
  z.object({
    type: z.literal('request'),
    id: z.string(),
    payload: coreWorkerOutgoingRequestMessageSchema,
  }),
])

export const coreWorkerIncomingIpcMessageSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('response'),
    id: z.string(),
    payload: coreWorkerIncomingResponseMessageSchema,
  }),
  z.object({
    type: z.literal('request'),
    id: z.string(),
    payload: coreWorkerIncomingRequestMessageSchema,
  }),
])

export type CoreWorkerOutgoingIpcMessage = z.infer<
  typeof coreWorkerOutgoingIpcMessageSchema
>

export type CoreWorkerIncomingIpcMessage = z.infer<
  typeof coreWorkerIncomingIpcMessageSchema
>

export type CoreWorkerIncomingRequestMessage = z.infer<
  typeof coreWorkerIncomingRequestMessageSchema
>

export type CoreWorkerOutgoingRequestMessage = z.infer<
  typeof coreWorkerOutgoingRequestMessageSchema
>

export type CoreWorkerIncomingResponseMessage = z.infer<
  typeof coreWorkerIncomingResponseMessageSchema
>
