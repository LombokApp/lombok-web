/* tslint:disable */
/* eslint-disable */
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { Controller, TsoaRoute, HttpStatusCodeLiteral, TsoaResponse } from '@tsoa/runtime';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { AuthController } from './../controllers/auth.controller';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { WorkerController } from './../controllers/worker.controller';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { FoldersController } from './../controllers/folders.controller';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { ServerController } from './../controllers/server.controller';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { ViewerController } from './../controllers/viewer.controller';
import { expressAuthentication } from './../middleware/auth.middleware';
import { iocContainer } from './../ioc';
import { IocContainer, IocContainerFactory } from '@tsoa/runtime';
import * as express from 'express';
import type { OpenApiValidator } from 'express-openapi-validate';

// From https://github.com/lukeautry/tsoa/blob/641f12c/packages/cli/src/utils/pathUtils.ts#L23
const convertPath = (path: string) => path.replace(/:([^\/]+)/g, '{$1}');

// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

export function RegisterRoutes(app: express.Router, validator: OpenApiValidator) {

  // ###########################################################################################################
  //  NOTE: If you do not see routes for all of your controllers in this file, then you might not have informed tsoa of where to look
  //  Please look into the "controllerPathGlobs" config option described in the readme: https://github.com/lukeautry/tsoa
  // ###########################################################################################################
  app.post(
    '/api/v1/token',
    authenticateMiddleware([{"RefreshToken":[]}]),
    validator.validate('post', convertPath('/token')),
    function AuthController_refreshToken(request: any, response: any, next: any) {
      const args = {
          req: {"in":"request","name":"req","required":true,"dataType":"object"},
      };

      // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

      const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

      const controller: any = container.get<AuthController>(AuthController);
      if (typeof controller['setStatus'] === 'function') {
        controller.setStatus(undefined);
      }

      const promise = controller.refreshToken.apply(controller, getArgs(args, request, response));
      promiseHandler(controller, promise, response, undefined, next);
    }
  );
  
  // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
  app.post(
    '/api/v1/signup',
    validator.validate('post', convertPath('/signup')),
    function AuthController_signup(request: any, response: any, next: any) {
      const args = {
          body: {"in":"body","name":"body","required":true,"dataType":"nestedObjectLiteral","nestedProperties":{"data":{"ref":"SignupParams","required":true}}},
      };

      // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

      const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

      const controller: any = container.get<AuthController>(AuthController);
      if (typeof controller['setStatus'] === 'function') {
        controller.setStatus(undefined);
      }

      const promise = controller.signup.apply(controller, getArgs(args, request, response));
      promiseHandler(controller, promise, response, 201, next);
    }
  );
  
  // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
  app.post(
    '/api/v1/login',
    authenticateMiddleware([{"Public":[]}]),
    validator.validate('post', convertPath('/login')),
    function AuthController_login(request: any, response: any, next: any) {
      const args = {
          body: {"in":"body","name":"body","required":true,"ref":"LoginParams"},
      };

      // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

      const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

      const controller: any = container.get<AuthController>(AuthController);
      if (typeof controller['setStatus'] === 'function') {
        controller.setStatus(undefined);
      }

      const promise = controller.login.apply(controller, getArgs(args, request, response));
      promiseHandler(controller, promise, response, undefined, next);
    }
  );
  
  // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
  app.get(
    '/api/v1/logout',
    authenticateMiddleware([{"AccessToken":[]}]),
    validator.validate('get', convertPath('/logout')),
    function AuthController_logout(request: any, response: any, next: any) {
      const args = {
          req: {"in":"request","name":"req","required":true,"dataType":"object"},
      };

      // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

      const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

      const controller: any = container.get<AuthController>(AuthController);
      if (typeof controller['setStatus'] === 'function') {
        controller.setStatus(undefined);
      }

      const promise = controller.logout.apply(controller, getArgs(args, request, response));
      promiseHandler(controller, promise, response, 204, next);
    }
  );
  
  // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
  app.get(
    '/api/v1/worker/:operationId/start',
    authenticateMiddleware([{"WorkerServiceToken":[]}]),
    validator.validate('get', convertPath('/worker/:operationId/start')),
    function WorkerController_startJob(request: any, response: any, next: any) {
      const args = {
          operationId: {"in":"path","name":"operationId","required":true,"dataType":"string"},
      };

      // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

      const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

      const controller: any = container.get<WorkerController>(WorkerController);
      if (typeof controller['setStatus'] === 'function') {
        controller.setStatus(undefined);
      }

      const promise = controller.startJob.apply(controller, getArgs(args, request, response));
      promiseHandler(controller, promise, response, undefined, next);
    }
  );
  
  // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
  app.post(
    '/api/v1/worker/:operationId/complete',
    authenticateMiddleware([{"WorkerServiceToken":[]}]),
    validator.validate('post', convertPath('/worker/:operationId/complete')),
    function WorkerController_completeJob(request: any, response: any, next: any) {
      const args = {
          operationId: {"in":"path","name":"operationId","required":true,"dataType":"string"},
      };

      // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

      const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

      const controller: any = container.get<WorkerController>(WorkerController);
      if (typeof controller['setStatus'] === 'function') {
        controller.setStatus(undefined);
      }

      const promise = controller.completeJob.apply(controller, getArgs(args, request, response));
      promiseHandler(controller, promise, response, undefined, next);
    }
  );
  
  // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
  app.post(
    '/api/v1/worker/:operationId/output-upload-urls',
    authenticateMiddleware([{"WorkerServiceToken":[]}]),
    validator.validate('post', convertPath('/worker/:operationId/output-upload-urls')),
    function WorkerController_createOutputUploadUrls(request: any, response: any, next: any) {
      const args = {
          operationId: {"in":"path","name":"operationId","required":true,"dataType":"string"},
          payload: {"in":"body","name":"payload","required":true,"ref":"CreateOutputUploadUrlsPayload"},
      };

      // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

      const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

      const controller: any = container.get<WorkerController>(WorkerController);
      if (typeof controller['setStatus'] === 'function') {
        controller.setStatus(undefined);
      }

      const promise = controller.createOutputUploadUrls.apply(controller, getArgs(args, request, response));
      promiseHandler(controller, promise, response, undefined, next);
    }
  );
  
  // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
  app.post(
    '/api/v1/worker/:operationId/metadata-upload-urls',
    authenticateMiddleware([{"WorkerServiceToken":[]}]),
    validator.validate('post', convertPath('/worker/:operationId/metadata-upload-urls')),
    function WorkerController_createMetadataUploadUrls(request: any, response: any, next: any) {
      const args = {
          operationId: {"in":"path","name":"operationId","required":true,"dataType":"string"},
          payload: {"in":"body","name":"payload","required":true,"ref":"CreateMetadataUploadUrlsPayload"},
      };

      // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

      const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

      const controller: any = container.get<WorkerController>(WorkerController);
      if (typeof controller['setStatus'] === 'function') {
        controller.setStatus(undefined);
      }

      const promise = controller.createMetadataUploadUrls.apply(controller, getArgs(args, request, response));
      promiseHandler(controller, promise, response, undefined, next);
    }
  );
  
  // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
  app.post(
    '/api/v1/worker/content-attributes',
    authenticateMiddleware([{"WorkerServiceToken":[]}]),
    validator.validate('post', convertPath('/worker/content-attributes')),
    function WorkerController_updateContentAttributes(request: any, response: any, next: any) {
      const args = {
          payload: {"in":"body","name":"payload","required":true,"dataType":"array","array":{"dataType":"refObject","ref":"ContentAttibutesPayload"}},
      };

      // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

      const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

      const controller: any = container.get<WorkerController>(WorkerController);
      if (typeof controller['setStatus'] === 'function') {
        controller.setStatus(undefined);
      }

      const promise = controller.updateContentAttributes.apply(controller, getArgs(args, request, response));
      promiseHandler(controller, promise, response, undefined, next);
    }
  );
  
  // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
  app.post(
    '/api/v1/worker/content-metadata',
    authenticateMiddleware([{"WorkerServiceToken":[]}]),
    validator.validate('post', convertPath('/worker/content-metadata')),
    function WorkerController_updateContentMetadata(request: any, response: any, next: any) {
      const args = {
          payload: {"in":"body","name":"payload","required":true,"dataType":"array","array":{"dataType":"refObject","ref":"ContentMetadataPayload"}},
      };

      // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

      const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

      const controller: any = container.get<WorkerController>(WorkerController);
      if (typeof controller['setStatus'] === 'function') {
        controller.setStatus(undefined);
      }

      const promise = controller.updateContentMetadata.apply(controller, getArgs(args, request, response));
      promiseHandler(controller, promise, response, undefined, next);
    }
  );
  
  // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
  app.post(
    '/api/v1/folders',
    authenticateMiddleware([{"AccessToken":[]}]),
    validator.validate('post', convertPath('/folders')),
    function FoldersController_createFolder(request: any, response: any, next: any) {
      const args = {
          req: {"in":"request","name":"req","required":true,"dataType":"object"},
          body: {"in":"body","name":"body","required":true,"dataType":"nestedObjectLiteral","nestedProperties":{"metadataLocation":{"ref":"UserLocationInputData"},"contentLocation":{"ref":"UserLocationInputData","required":true},"name":{"dataType":"string","required":true}}},
      };

      // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

      const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

      const controller: any = container.get<FoldersController>(FoldersController);
      if (typeof controller['setStatus'] === 'function') {
        controller.setStatus(undefined);
      }

      const promise = controller.createFolder.apply(controller, getArgs(args, request, response));
      promiseHandler(controller, promise, response, undefined, next);
    }
  );
  
  // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
  app.get(
    '/api/v1/folders/:folderId',
    authenticateMiddleware([{"AccessToken":[]}]),
    validator.validate('get', convertPath('/folders/:folderId')),
    function FoldersController_getFolder(request: any, response: any, next: any) {
      const args = {
          folderId: {"in":"path","name":"folderId","required":true,"dataType":"string"},
          req: {"in":"request","name":"req","required":true,"dataType":"object"},
      };

      // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

      const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

      const controller: any = container.get<FoldersController>(FoldersController);
      if (typeof controller['setStatus'] === 'function') {
        controller.setStatus(undefined);
      }

      const promise = controller.getFolder.apply(controller, getArgs(args, request, response));
      promiseHandler(controller, promise, response, undefined, next);
    }
  );
  
  // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
  app.get(
    '/api/v1/folders',
    authenticateMiddleware([{"AccessToken":[]}]),
    validator.validate('get', convertPath('/folders')),
    function FoldersController_listFolders(request: any, response: any, next: any) {
      const args = {
          req: {"in":"request","name":"req","required":true,"dataType":"object"},
      };

      // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

      const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

      const controller: any = container.get<FoldersController>(FoldersController);
      if (typeof controller['setStatus'] === 'function') {
        controller.setStatus(undefined);
      }

      const promise = controller.listFolders.apply(controller, getArgs(args, request, response));
      promiseHandler(controller, promise, response, undefined, next);
    }
  );
  
  // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
  app.delete(
    '/api/v1/folders/:folderId',
    authenticateMiddleware([{"AccessToken":[]}]),
    validator.validate('delete', convertPath('/folders/:folderId')),
    function FoldersController_deleteFolder(request: any, response: any, next: any) {
      const args = {
          req: {"in":"request","name":"req","required":true,"dataType":"object"},
          folderId: {"in":"path","name":"folderId","required":true,"dataType":"string"},
      };

      // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

      const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

      const controller: any = container.get<FoldersController>(FoldersController);
      if (typeof controller['setStatus'] === 'function') {
        controller.setStatus(undefined);
      }

      const promise = controller.deleteFolder.apply(controller, getArgs(args, request, response));
      promiseHandler(controller, promise, response, undefined, next);
    }
  );
  
  // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
  app.get(
    '/api/v1/folders/:folderId/metadata',
    authenticateMiddleware([{"AccessToken":[]}]),
    validator.validate('get', convertPath('/folders/:folderId/metadata')),
    function FoldersController_getFolderMetadata(request: any, response: any, next: any) {
      const args = {
          req: {"in":"request","name":"req","required":true,"dataType":"object"},
          folderId: {"in":"path","name":"folderId","required":true,"dataType":"string"},
      };

      // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

      const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

      const controller: any = container.get<FoldersController>(FoldersController);
      if (typeof controller['setStatus'] === 'function') {
        controller.setStatus(undefined);
      }

      const promise = controller.getFolderMetadata.apply(controller, getArgs(args, request, response));
      promiseHandler(controller, promise, response, undefined, next);
    }
  );
  
  // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
  app.get(
    '/api/v1/folders/:folderId/objects/:objectKey',
    authenticateMiddleware([{"AccessToken":[]}]),
    validator.validate('get', convertPath('/folders/:folderId/objects/:objectKey')),
    function FoldersController_getFolderObject(request: any, response: any, next: any) {
      const args = {
          req: {"in":"request","name":"req","required":true,"dataType":"object"},
          folderId: {"in":"path","name":"folderId","required":true,"dataType":"string"},
          objectKey: {"in":"path","name":"objectKey","required":true,"dataType":"string"},
      };

      // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

      const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

      const controller: any = container.get<FoldersController>(FoldersController);
      if (typeof controller['setStatus'] === 'function') {
        controller.setStatus(undefined);
      }

      const promise = controller.getFolderObject.apply(controller, getArgs(args, request, response));
      promiseHandler(controller, promise, response, undefined, next);
    }
  );
  
  // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
  app.post(
    '/api/v1/folders/:folderId/operations',
    authenticateMiddleware([{"AccessToken":[]}]),
    validator.validate('post', convertPath('/folders/:folderId/operations')),
    function FoldersController_enqueueFolderOperation(request: any, response: any, next: any) {
      const args = {
          req: {"in":"request","name":"req","required":true,"dataType":"object"},
          folderId: {"in":"path","name":"folderId","required":true,"dataType":"string"},
          folderOperation: {"in":"body","name":"folderOperation","required":true,"ref":"FolderOperationRequestPayload"},
      };

      // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

      const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

      const controller: any = container.get<FoldersController>(FoldersController);
      if (typeof controller['setStatus'] === 'function') {
        controller.setStatus(undefined);
      }

      const promise = controller.enqueueFolderOperation.apply(controller, getArgs(args, request, response));
      promiseHandler(controller, promise, response, undefined, next);
    }
  );
  
  // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
  app.delete(
    '/api/v1/folders/:folderId/objects/:objectKey',
    authenticateMiddleware([{"AccessToken":[]}]),
    validator.validate('delete', convertPath('/folders/:folderId/objects/:objectKey')),
    function FoldersController_deleteFolderObject(request: any, response: any, next: any) {
      const args = {
          req: {"in":"request","name":"req","required":true,"dataType":"object"},
          folderId: {"in":"path","name":"folderId","required":true,"dataType":"string"},
          objectKey: {"in":"path","name":"objectKey","required":true,"dataType":"string"},
      };

      // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

      const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

      const controller: any = container.get<FoldersController>(FoldersController);
      if (typeof controller['setStatus'] === 'function') {
        controller.setStatus(undefined);
      }

      const promise = controller.deleteFolderObject.apply(controller, getArgs(args, request, response));
      promiseHandler(controller, promise, response, undefined, next);
    }
  );
  
  // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
  app.get(
    '/api/v1/folders/:folderId/objects',
    authenticateMiddleware([{"AccessToken":[]}]),
    validator.validate('get', convertPath('/folders/:folderId/objects')),
    function FoldersController_listFolderObjects(request: any, response: any, next: any) {
      const args = {
          req: {"in":"request","name":"req","required":true,"dataType":"object"},
          folderId: {"in":"path","name":"folderId","required":true,"dataType":"string"},
          search: {"in":"query","name":"search","dataType":"string"},
          offset: {"in":"query","name":"offset","dataType":"double"},
          limit: {"in":"query","name":"limit","dataType":"double"},
      };

      // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

      const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

      const controller: any = container.get<FoldersController>(FoldersController);
      if (typeof controller['setStatus'] === 'function') {
        controller.setStatus(undefined);
      }

      const promise = controller.listFolderObjects.apply(controller, getArgs(args, request, response));
      promiseHandler(controller, promise, response, undefined, next);
    }
  );
  
  // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
  app.post(
    '/api/v1/folders/:folderId/index-all',
    authenticateMiddleware([{"AccessToken":[]}]),
    validator.validate('post', convertPath('/folders/:folderId/index-all')),
    function FoldersController_indexAllContent(request: any, response: any, next: any) {
      const args = {
          req: {"in":"request","name":"req","required":true,"dataType":"object"},
          folderId: {"in":"path","name":"folderId","required":true,"dataType":"string"},
      };

      // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

      const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

      const controller: any = container.get<FoldersController>(FoldersController);
      if (typeof controller['setStatus'] === 'function') {
        controller.setStatus(undefined);
      }

      const promise = controller.indexAllContent.apply(controller, getArgs(args, request, response));
      promiseHandler(controller, promise, response, undefined, next);
    }
  );
  
  // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
  app.put(
    '/api/v1/folders/:folderId/objects/:objectKey',
    authenticateMiddleware([{"AccessToken":[]}]),
    validator.validate('put', convertPath('/folders/:folderId/objects/:objectKey')),
    function FoldersController_refreshFolderObjectS3Metadata(request: any, response: any, next: any) {
      const args = {
          req: {"in":"request","name":"req","required":true,"dataType":"object"},
          folderId: {"in":"path","name":"folderId","required":true,"dataType":"string"},
          objectKey: {"in":"path","name":"objectKey","required":true,"dataType":"string"},
          body: {"in":"body","name":"body","required":true,"dataType":"nestedObjectLiteral","nestedProperties":{"eTag":{"dataType":"string"}}},
      };

      // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

      const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

      const controller: any = container.get<FoldersController>(FoldersController);
      if (typeof controller['setStatus'] === 'function') {
        controller.setStatus(undefined);
      }

      const promise = controller.refreshFolderObjectS3Metadata.apply(controller, getArgs(args, request, response));
      promiseHandler(controller, promise, response, undefined, next);
    }
  );
  
  // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
  app.post(
    '/api/v1/folders/:folderId/refresh',
    authenticateMiddleware([{"AccessToken":[]}]),
    validator.validate('post', convertPath('/folders/:folderId/refresh')),
    function FoldersController_refreshFolder(request: any, response: any, next: any) {
      const args = {
          req: {"in":"request","name":"req","required":true,"dataType":"object"},
          folderId: {"in":"path","name":"folderId","required":true,"dataType":"string"},
      };

      // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

      const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

      const controller: any = container.get<FoldersController>(FoldersController);
      if (typeof controller['setStatus'] === 'function') {
        controller.setStatus(undefined);
      }

      const promise = controller.refreshFolder.apply(controller, getArgs(args, request, response));
      promiseHandler(controller, promise, response, undefined, next);
    }
  );
  
  // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
  app.post(
    '/api/v1/folders/:folderId/presigned-urls',
    authenticateMiddleware([{"AccessToken":[]}]),
    validator.validate('post', convertPath('/folders/:folderId/presigned-urls')),
    function FoldersController_createPresignedUrls(request: any, response: any, next: any) {
      const args = {
          req: {"in":"request","name":"req","required":true,"dataType":"object"},
          folderId: {"in":"path","name":"folderId","required":true,"dataType":"string"},
          body: {"in":"body","name":"body","required":true,"dataType":"array","array":{"dataType":"refObject","ref":"SignedURLsRequest"}},
      };

      // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

      const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

      const controller: any = container.get<FoldersController>(FoldersController);
      if (typeof controller['setStatus'] === 'function') {
        controller.setStatus(undefined);
      }

      const promise = controller.createPresignedUrls.apply(controller, getArgs(args, request, response));
      promiseHandler(controller, promise, response, undefined, next);
    }
  );
  
  // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
  app.post(
    '/api/v1/folders/:folderId/socket-auth',
    authenticateMiddleware([{"AccessToken":[]}]),
    validator.validate('post', convertPath('/folders/:folderId/socket-auth')),
    function FoldersController_createSocketAuthentication(request: any, response: any, next: any) {
      const args = {
          req: {"in":"request","name":"req","required":true,"dataType":"object"},
          folderId: {"in":"path","name":"folderId","required":true,"dataType":"string"},
      };

      // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

      const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

      const controller: any = container.get<FoldersController>(FoldersController);
      if (typeof controller['setStatus'] === 'function') {
        controller.setStatus(undefined);
      }

      const promise = controller.createSocketAuthentication.apply(controller, getArgs(args, request, response));
      promiseHandler(controller, promise, response, undefined, next);
    }
  );
  
  // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
  app.get(
    '/api/v1/folders/:folderId/operations',
    authenticateMiddleware([{"AccessToken":[]}]),
    validator.validate('get', convertPath('/folders/:folderId/operations')),
    function FoldersController_listFolderOperations(request: any, response: any, next: any) {
      const args = {
          req: {"in":"request","name":"req","required":true,"dataType":"object"},
          folderId: {"in":"path","name":"folderId","required":true,"dataType":"string"},
          sort: {"in":"query","name":"sort","ref":"FolderOperationSort"},
          status: {"in":"query","name":"status","ref":"FolderOperationStatus"},
          limit: {"in":"query","name":"limit","dataType":"double"},
          offset: {"in":"query","name":"offset","dataType":"double"},
      };

      // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

      const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

      const controller: any = container.get<FoldersController>(FoldersController);
      if (typeof controller['setStatus'] === 'function') {
        controller.setStatus(undefined);
      }

      const promise = controller.listFolderOperations.apply(controller, getArgs(args, request, response));
      promiseHandler(controller, promise, response, undefined, next);
    }
  );
  
  // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
  app.get(
    '/api/v1/server/settings/server-locations/:locationType',
    authenticateMiddleware([{"AccessToken":["user_folders_location:read"]}]),
    validator.validate('get', convertPath('/server/settings/server-locations/:locationType')),
    function ServerController_listServerLocations(request: any, response: any, next: any) {
      const args = {
          req: {"in":"request","name":"req","required":true,"dataType":"object"},
          locationType: {"in":"path","name":"locationType","required":true,"ref":"ServerLocationType"},
      };

      // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

      const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

      const controller: any = container.get<ServerController>(ServerController);
      if (typeof controller['setStatus'] === 'function') {
        controller.setStatus(undefined);
      }

      const promise = controller.listServerLocations.apply(controller, getArgs(args, request, response));
      promiseHandler(controller, promise, response, undefined, next);
    }
  );
  
  // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
  app.post(
    '/api/v1/server/settings/locations/:locationType',
    authenticateMiddleware([{"AccessToken":["metadata_location:read"]}]),
    validator.validate('post', convertPath('/server/settings/locations/:locationType')),
    function ServerController_addServerConfigLocation(request: any, response: any, next: any) {
      const args = {
          req: {"in":"request","name":"req","required":true,"dataType":"object"},
          payload: {"in":"body","name":"payload","required":true,"ref":"ServerLocationInputData"},
          locationType: {"in":"path","name":"locationType","required":true,"ref":"ServerLocationType"},
      };

      // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

      const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

      const controller: any = container.get<ServerController>(ServerController);
      if (typeof controller['setStatus'] === 'function') {
        controller.setStatus(undefined);
      }

      const promise = controller.addServerConfigLocation.apply(controller, getArgs(args, request, response));
      promiseHandler(controller, promise, response, undefined, next);
    }
  );
  
  // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
  app.delete(
    '/api/v1/server/settings/locations/:locationType/:locationId',
    authenticateMiddleware([{"AccessToken":["metadata_location:read"]}]),
    validator.validate('delete', convertPath('/server/settings/locations/:locationType/:locationId')),
    function ServerController_deleteServerConfigLocation(request: any, response: any, next: any) {
      const args = {
          req: {"in":"request","name":"req","required":true,"dataType":"object"},
          locationType: {"in":"path","name":"locationType","required":true,"ref":"ServerLocationType"},
          locationId: {"in":"path","name":"locationId","required":true,"dataType":"string"},
      };

      // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

      const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

      const controller: any = container.get<ServerController>(ServerController);
      if (typeof controller['setStatus'] === 'function') {
        controller.setStatus(undefined);
      }

      const promise = controller.deleteServerConfigLocation.apply(controller, getArgs(args, request, response));
      promiseHandler(controller, promise, response, undefined, next);
    }
  );
  
  // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
  app.get(
    '/api/v1/server/users',
    authenticateMiddleware([{"AccessToken":["user:read"]}]),
    validator.validate('get', convertPath('/server/users')),
    function ServerController_listUsers(request: any, response: any, next: any) {
      const args = {
          req: {"in":"request","name":"req","required":true,"dataType":"object"},
      };

      // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

      const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

      const controller: any = container.get<ServerController>(ServerController);
      if (typeof controller['setStatus'] === 'function') {
        controller.setStatus(undefined);
      }

      const promise = controller.listUsers.apply(controller, getArgs(args, request, response));
      promiseHandler(controller, promise, response, undefined, next);
    }
  );
  
  // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
  app.get(
    '/api/v1/server/users/:userId',
    authenticateMiddleware([{"AccessToken":["user:read"]}]),
    validator.validate('get', convertPath('/server/users/:userId')),
    function ServerController_getUsers(request: any, response: any, next: any) {
      const args = {
          req: {"in":"request","name":"req","required":true,"dataType":"object"},
          userId: {"in":"path","name":"userId","required":true,"dataType":"string"},
      };

      // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

      const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

      const controller: any = container.get<ServerController>(ServerController);
      if (typeof controller['setStatus'] === 'function') {
        controller.setStatus(undefined);
      }

      const promise = controller.getUsers.apply(controller, getArgs(args, request, response));
      promiseHandler(controller, promise, response, undefined, next);
    }
  );
  
  // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
  app.post(
    '/api/v1/server/users',
    authenticateMiddleware([{"AccessToken":["user:create"]}]),
    validator.validate('post', convertPath('/server/users')),
    function ServerController_createUser(request: any, response: any, next: any) {
      const args = {
          req: {"in":"request","name":"req","required":true,"dataType":"object"},
          body: {"in":"body","name":"body","required":true,"ref":"CreateUserData"},
      };

      // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

      const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

      const controller: any = container.get<ServerController>(ServerController);
      if (typeof controller['setStatus'] === 'function') {
        controller.setStatus(undefined);
      }

      const promise = controller.createUser.apply(controller, getArgs(args, request, response));
      promiseHandler(controller, promise, response, undefined, next);
    }
  );
  
  // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
  app.put(
    '/api/v1/server/users/:userId',
    authenticateMiddleware([{"AccessToken":["user:create"]}]),
    validator.validate('put', convertPath('/server/users/:userId')),
    function ServerController_updateUser(request: any, response: any, next: any) {
      const args = {
          req: {"in":"request","name":"req","required":true,"dataType":"object"},
          userId: {"in":"path","name":"userId","required":true,"dataType":"string"},
          body: {"in":"body","name":"body","required":true,"ref":"UpdateUserData"},
      };

      // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

      const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

      const controller: any = container.get<ServerController>(ServerController);
      if (typeof controller['setStatus'] === 'function') {
        controller.setStatus(undefined);
      }

      const promise = controller.updateUser.apply(controller, getArgs(args, request, response));
      promiseHandler(controller, promise, response, undefined, next);
    }
  );
  
  // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
  app.delete(
    '/api/v1/server/users/:userId',
    authenticateMiddleware([{"AccessToken":["user:create"]}]),
    validator.validate('delete', convertPath('/server/users/:userId')),
    function ServerController_deleteUser(request: any, response: any, next: any) {
      const args = {
          req: {"in":"request","name":"req","required":true,"dataType":"object"},
          userId: {"in":"path","name":"userId","required":true,"dataType":"string"},
      };

      // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

      const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

      const controller: any = container.get<ServerController>(ServerController);
      if (typeof controller['setStatus'] === 'function') {
        controller.setStatus(undefined);
      }

      const promise = controller.deleteUser.apply(controller, getArgs(args, request, response));
      promiseHandler(controller, promise, response, undefined, next);
    }
  );
  
  // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
  app.get(
    '/api/v1/server/settings',
    authenticateMiddleware([{"AccessToken":["server_settings:read"]}]),
    validator.validate('get', convertPath('/server/settings')),
    function ServerController_getSettings(request: any, response: any, next: any) {
      const args = {
          req: {"in":"request","name":"req","required":true,"dataType":"object"},
      };

      // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

      const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

      const controller: any = container.get<ServerController>(ServerController);
      if (typeof controller['setStatus'] === 'function') {
        controller.setStatus(undefined);
      }

      const promise = controller.getSettings.apply(controller, getArgs(args, request, response));
      promiseHandler(controller, promise, response, undefined, next);
    }
  );
  
  // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
  app.put(
    '/api/v1/server/settings/:settingsKey',
    authenticateMiddleware([{"AccessToken":["server_settings:update"]}]),
    validator.validate('put', convertPath('/server/settings/:settingsKey')),
    function ServerController_updateSetting(request: any, response: any, next: any) {
      const args = {
          req: {"in":"request","name":"req","required":true,"dataType":"object"},
          settingsKey: {"in":"path","name":"settingsKey","required":true,"dataType":"string"},
          settingsValue: {"in":"body","name":"settingsValue","required":true,"dataType":"nestedObjectLiteral","nestedProperties":{"value":{"dataType":"any","required":true}}},
      };

      // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

      const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

      const controller: any = container.get<ServerController>(ServerController);
      if (typeof controller['setStatus'] === 'function') {
        controller.setStatus(undefined);
      }

      const promise = controller.updateSetting.apply(controller, getArgs(args, request, response));
      promiseHandler(controller, promise, response, undefined, next);
    }
  );
  
  // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
  app.delete(
    '/api/v1/server/settings/:settingsKey',
    authenticateMiddleware([{"AccessToken":["server_settings:update"]}]),
    validator.validate('delete', convertPath('/server/settings/:settingsKey')),
    function ServerController_resetSetting(request: any, response: any, next: any) {
      const args = {
          req: {"in":"request","name":"req","required":true,"dataType":"object"},
          settingsKey: {"in":"path","name":"settingsKey","required":true,"dataType":"string"},
      };

      // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

      const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

      const controller: any = container.get<ServerController>(ServerController);
      if (typeof controller['setStatus'] === 'function') {
        controller.setStatus(undefined);
      }

      const promise = controller.resetSetting.apply(controller, getArgs(args, request, response));
      promiseHandler(controller, promise, response, undefined, next);
    }
  );
  
  // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
  app.get(
    '/api/v1/viewer',
    authenticateMiddleware([{"AccessToken":["viewer:read"]}]),
    validator.validate('get', convertPath('/viewer')),
    function ViewerController_getViewer(request: any, response: any, next: any) {
      const args = {
          req: {"in":"request","name":"req","required":true,"dataType":"object"},
      };

      // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

      const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

      const controller: any = container.get<ViewerController>(ViewerController);
      if (typeof controller['setStatus'] === 'function') {
        controller.setStatus(undefined);
      }

      const promise = controller.getViewer.apply(controller, getArgs(args, request, response));
      promiseHandler(controller, promise, response, undefined, next);
    }
  );
  
  // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
  app.put(
    '/api/v1/viewer',
    authenticateMiddleware([{"AccessToken":["viewer:update"]}]),
    validator.validate('put', convertPath('/viewer')),
    function ViewerController_updateViewer(request: any, response: any, next: any) {
      const args = {
          req: {"in":"request","name":"req","required":true,"dataType":"object"},
          viewerUpdatePayload: {"in":"body","name":"viewerUpdatePayload","required":true,"ref":"ViewerUpdatePayload"},
      };

      // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

      const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

      const controller: any = container.get<ViewerController>(ViewerController);
      if (typeof controller['setStatus'] === 'function') {
        controller.setStatus(undefined);
      }

      const promise = controller.updateViewer.apply(controller, getArgs(args, request, response));
      promiseHandler(controller, promise, response, undefined, next);
    }
  );
  
  // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

  // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

  function isController(object: any): object is Controller {
    return 'getHeaders' in object && 'getStatus' in object && 'setStatus' in object;
  }

  function promiseHandler(controllerObj: any, promise: any, response: any, successStatus: any, next: any) {
    return Promise.resolve(promise)
      .then((data: any) => {
        let statusCode = successStatus;
        let headers;
        if (isController(controllerObj)) {
          headers = controllerObj.getHeaders();
          statusCode = controllerObj.getStatus() || statusCode;
        }

        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

        returnHandler(response, statusCode, data, headers)
      })
      .catch((error: any) => next(error));
  }

  // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

  function returnHandler(response: any, statusCode?: number, data?: any, headers: any = {}) {
    if (response.headersSent) {
      return;
    }
    Object.keys(headers).forEach((name: string) => {
      response.set(name, headers[name]);
    });
    if (data && typeof data.pipe === 'function' && data.readable && typeof data._read === 'function') {
      data.pipe(response);
    } else if (data !== null && data !== undefined) {
      response.status(statusCode || 200).json(data);
    } else {
      response.status(statusCode || 204).end();
    }
  }

  // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

  function responder(response: any): TsoaResponse<HttpStatusCodeLiteral, unknown>  {
    return function(status, data, headers) {
      returnHandler(response, status, data, headers);
    };
  };

  // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

  function getArgs(args: any, request: any, response: any): any[] {
    const values = Object.keys(args).map((key) => {
      const name = args[key].name;
      switch (args[key].in) {
        case 'request':
          return request;
        case 'query':
          return request.query[name];
        case 'path':
          return request.params[name];
        case 'header':
          return request.header(name);
        case 'body':
          return request.body;
        case 'body-prop':
          return request.body[name];
        case 'formData':
          if (args[key].dataType === 'file') {
            return request.file;
          } else if (args[key].dataType === 'array' && args[key].array.dataType === 'file') {
            return request.files;
          } else {
            return request.body[name];
          }
        case 'res':
          return responder(response);
      }
    });
    
    return values;
  }

  // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
}

// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa


// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

export function authenticateMiddleware(security: TsoaRoute.Security[] = []) {
  return function runAuthenticationMiddleware(request: any, _response: any, next: any) {
    let responded = 0;
    let success = false;

    const succeed = function(user: any) {
      if (!success) {
        success = true;
        responded++;
        request['user'] = user;
        next();
      }
    }

    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

    const fail = function(error: any) {
      responded++;
      if (responded == security.length && !success) {
        error.status = error.status || 401;
        next(error)
      }
    }

    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

    for (const secMethod of security) {
      if (Object.keys(secMethod).length > 1) {
        let promises: Promise<any>[] = [];

        for (const name in secMethod) {
          promises.push(expressAuthentication(request, name, secMethod[name]));
        }

        Promise.all(promises)
          .then((users) => { succeed(users[0]); })
          .catch(fail);
      } else {
        for (const name in secMethod) {
          expressAuthentication(request, name, secMethod[name])
            .then(succeed)
            .catch(fail);
        }
      }
    }
  }
}
