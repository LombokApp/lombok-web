export declare const schema: {
    readonly components: {
        readonly examples: {};
        readonly headers: {};
        readonly parameters: {};
        readonly requestBodies: {};
        readonly responses: {};
        readonly schemas: {
            readonly SessionResponse: {
                readonly properties: {
                    readonly data: {
                        readonly properties: {
                            readonly expiresAt: {
                                readonly type: "string";
                                readonly format: "date-time";
                            };
                            readonly refreshToken: {
                                readonly type: "string";
                            };
                            readonly accessToken: {
                                readonly type: "string";
                            };
                        };
                        readonly required: readonly ["expiresAt", "refreshToken", "accessToken"];
                        readonly type: "object";
                    };
                };
                readonly required: readonly ["data"];
                readonly type: "object";
                readonly additionalProperties: false;
            };
            readonly ErrorMetaData: {
                readonly properties: {};
                readonly type: "object";
                readonly additionalProperties: {};
            };
            readonly ErrorData: {
                readonly properties: {
                    readonly code: {
                        readonly type: "string";
                    };
                    readonly title: {
                        readonly type: "string";
                    };
                    readonly detail: {
                        readonly type: "string";
                    };
                    readonly meta: {
                        readonly $ref: "#/components/schemas/ErrorMetaData";
                    };
                    readonly pointer: {
                        readonly type: "string";
                    };
                };
                readonly required: readonly ["code"];
                readonly type: "object";
                readonly additionalProperties: false;
            };
            readonly ErrorResponse: {
                readonly properties: {
                    readonly errors: {
                        readonly items: {
                            readonly $ref: "#/components/schemas/ErrorData";
                        };
                        readonly type: "array";
                    };
                };
                readonly required: readonly ["errors"];
                readonly type: "object";
                readonly additionalProperties: false;
            };
            readonly PlatformRole: {
                readonly enum: readonly ["ANONYMOUS", "AUTHENTICATED", "ADMIN", "SERVICE"];
                readonly type: "string";
            };
            readonly EmailFormat: {
                readonly type: "string";
                readonly format: "email";
                readonly maxLength: 255;
            };
            readonly UserData: {
                readonly properties: {
                    readonly createdAt: {
                        readonly type: "string";
                        readonly format: "date-time";
                    };
                    readonly updatedAt: {
                        readonly type: "string";
                        readonly format: "date-time";
                    };
                    readonly id: {
                        readonly type: "string";
                    };
                    readonly role: {
                        readonly $ref: "#/components/schemas/PlatformRole";
                    };
                    readonly email: {
                        readonly $ref: "#/components/schemas/EmailFormat";
                    };
                };
                readonly required: readonly ["createdAt", "updatedAt", "id", "role"];
                readonly type: "object";
                readonly additionalProperties: false;
            };
            readonly User: {
                readonly $ref: "#/components/schemas/UserData";
            };
            readonly SignupParams: {
                readonly properties: {
                    readonly email: {
                        readonly type: "string";
                        readonly maxLength: 255;
                    };
                    readonly password: {
                        readonly type: "string";
                        readonly maxLength: 255;
                    };
                };
                readonly required: readonly ["email", "password"];
                readonly type: "object";
                readonly additionalProperties: false;
            };
            readonly LoginParams: {
                readonly properties: {
                    readonly login: {
                        readonly type: "string";
                    };
                    readonly password: {
                        readonly type: "string";
                    };
                };
                readonly required: readonly ["login", "password"];
                readonly type: "object";
                readonly additionalProperties: false;
            };
            readonly OutputUploadUrlsResponse: {
                readonly properties: {
                    readonly folderId: {
                        readonly type: "string";
                    };
                    readonly objectKey: {
                        readonly type: "string";
                    };
                    readonly url: {
                        readonly type: "string";
                    };
                };
                readonly required: readonly ["folderId", "objectKey", "url"];
                readonly type: "object";
                readonly additionalProperties: false;
            };
            readonly CreateOutputUploadUrlsPayload: {
                readonly properties: {
                    readonly outputFiles: {
                        readonly items: {
                            readonly properties: {
                                readonly objectKey: {
                                    readonly type: "string";
                                };
                                readonly folderId: {
                                    readonly type: "string";
                                };
                            };
                            readonly required: readonly ["objectKey", "folderId"];
                            readonly type: "object";
                        };
                        readonly type: "array";
                    };
                };
                readonly required: readonly ["outputFiles"];
                readonly type: "object";
                readonly additionalProperties: false;
            };
            readonly MetadataUploadUrlsResponse: {
                readonly properties: {
                    readonly folderId: {
                        readonly type: "string";
                    };
                    readonly objectKey: {
                        readonly type: "string";
                    };
                    readonly urls: {
                        readonly properties: {};
                        readonly additionalProperties: {
                            readonly type: "string";
                        };
                        readonly type: "object";
                    };
                };
                readonly required: readonly ["folderId", "objectKey", "urls"];
                readonly type: "object";
                readonly additionalProperties: false;
            };
            readonly CreateMetadataUploadUrlsPayload: {
                readonly properties: {
                    readonly contentHash: {
                        readonly type: "string";
                    };
                    readonly metadataFiles: {
                        readonly items: {
                            readonly properties: {
                                readonly metadataHashes: {
                                    readonly properties: {};
                                    readonly additionalProperties: {
                                        readonly type: "string";
                                    };
                                    readonly type: "object";
                                };
                                readonly objectKey: {
                                    readonly type: "string";
                                };
                                readonly folderId: {
                                    readonly type: "string";
                                };
                            };
                            readonly required: readonly ["metadataHashes", "objectKey", "folderId"];
                            readonly type: "object";
                        };
                        readonly type: "array";
                    };
                };
                readonly required: readonly ["contentHash", "metadataFiles"];
                readonly type: "object";
                readonly additionalProperties: false;
            };
            readonly MediaType: {
                readonly enum: readonly ["IMAGE", "VIDEO", "AUDIO", "DOCUMENT", "UNKNOWN"];
                readonly type: "string";
            };
            readonly ContentAttributesType: {
                readonly properties: {
                    readonly mediaType: {
                        readonly $ref: "#/components/schemas/MediaType";
                    };
                    readonly mimeType: {
                        readonly type: "string";
                    };
                    readonly height: {
                        readonly type: "number";
                        readonly format: "double";
                    };
                    readonly width: {
                        readonly type: "number";
                        readonly format: "double";
                    };
                    readonly orientation: {
                        readonly type: "number";
                        readonly format: "double";
                    };
                    readonly lengthMs: {
                        readonly type: "number";
                        readonly format: "double";
                    };
                    readonly bitrate: {
                        readonly type: "number";
                        readonly format: "double";
                    };
                };
                readonly required: readonly ["mediaType", "mimeType", "height", "width", "orientation", "lengthMs", "bitrate"];
                readonly type: "object";
                readonly additionalProperties: false;
            };
            readonly ContentAttibutesPayload: {
                readonly properties: {
                    readonly folderId: {
                        readonly type: "string";
                    };
                    readonly objectKey: {
                        readonly type: "string";
                    };
                    readonly hash: {
                        readonly type: "string";
                    };
                    readonly attributes: {
                        readonly $ref: "#/components/schemas/ContentAttributesType";
                    };
                };
                readonly required: readonly ["folderId", "objectKey", "hash", "attributes"];
                readonly type: "object";
                readonly additionalProperties: false;
            };
            readonly MetadataEntry: {
                readonly properties: {
                    readonly mimeType: {
                        readonly type: "string";
                    };
                    readonly size: {
                        readonly type: "number";
                        readonly format: "double";
                    };
                    readonly hash: {
                        readonly type: "string";
                    };
                };
                readonly required: readonly ["mimeType", "size", "hash"];
                readonly type: "object";
                readonly additionalProperties: false;
            };
            readonly ContentMetadataType: {
                readonly properties: {};
                readonly type: "object";
                readonly additionalProperties: {
                    readonly $ref: "#/components/schemas/MetadataEntry";
                };
            };
            readonly ContentMetadataPayload: {
                readonly properties: {
                    readonly folderId: {
                        readonly type: "string";
                    };
                    readonly objectKey: {
                        readonly type: "string";
                    };
                    readonly hash: {
                        readonly type: "string";
                    };
                    readonly metadata: {
                        readonly $ref: "#/components/schemas/ContentMetadataType";
                    };
                };
                readonly required: readonly ["folderId", "objectKey", "hash", "metadata"];
                readonly type: "object";
                readonly additionalProperties: false;
            };
            readonly FolderData: {
                readonly properties: {
                    readonly createdAt: {
                        readonly type: "string";
                        readonly format: "date-time";
                    };
                    readonly updatedAt: {
                        readonly type: "string";
                        readonly format: "date-time";
                    };
                    readonly id: {
                        readonly type: "string";
                    };
                    readonly ownerId: {
                        readonly type: "string";
                    };
                    readonly name: {
                        readonly type: "string";
                    };
                    readonly accessKeyId: {
                        readonly type: "string";
                    };
                    readonly endpoint: {
                        readonly type: "string";
                    };
                    readonly region: {
                        readonly type: "string";
                    };
                    readonly bucket: {
                        readonly type: "string";
                    };
                    readonly prefix: {
                        readonly type: "string";
                    };
                };
                readonly required: readonly ["createdAt", "updatedAt", "id", "name", "accessKeyId", "endpoint", "bucket"];
                readonly type: "object";
                readonly additionalProperties: false;
            };
            readonly FolderPermissionName: {
                readonly enum: readonly ["folder_refresh", "folder_manage_shares", "folder_forget", "object_edit", "object_manage", "tag_create", "tag_associate"];
                readonly type: "string";
            };
            readonly FolderAndPermission: {
                readonly properties: {
                    readonly folder: {
                        readonly $ref: "#/components/schemas/FolderData";
                    };
                    readonly permissions: {
                        readonly items: {
                            readonly type: "string";
                        };
                        readonly type: "array";
                    };
                };
                readonly required: readonly ["folder", "permissions"];
                readonly type: "object";
                readonly additionalProperties: false;
            };
            readonly ListFoldersResponse: {
                readonly properties: {
                    readonly meta: {
                        readonly properties: {
                            readonly totalCount: {
                                readonly type: "number";
                                readonly format: "double";
                            };
                        };
                        readonly required: readonly ["totalCount"];
                        readonly type: "object";
                    };
                    readonly result: {
                        readonly items: {
                            readonly $ref: "#/components/schemas/FolderAndPermission";
                        };
                        readonly type: "array";
                    };
                };
                readonly required: readonly ["meta", "result"];
                readonly type: "object";
                readonly additionalProperties: false;
            };
            readonly ContentAttributesByHash: {
                readonly properties: {};
                readonly type: "object";
                readonly additionalProperties: {
                    readonly $ref: "#/components/schemas/ContentAttributesType";
                };
            };
            readonly ContentMetadataByHash: {
                readonly properties: {};
                readonly type: "object";
                readonly additionalProperties: {
                    readonly $ref: "#/components/schemas/ContentMetadataType";
                };
            };
            readonly FolderObjectData: {
                readonly properties: {
                    readonly createdAt: {
                        readonly type: "string";
                        readonly format: "date-time";
                    };
                    readonly updatedAt: {
                        readonly type: "string";
                        readonly format: "date-time";
                    };
                    readonly id: {
                        readonly type: "string";
                    };
                    readonly objectKey: {
                        readonly type: "string";
                    };
                    readonly folder: {
                        readonly properties: {
                            readonly id: {
                                readonly type: "string";
                            };
                        };
                        readonly required: readonly ["id"];
                        readonly type: "object";
                    };
                    readonly contentAttributes: {
                        readonly $ref: "#/components/schemas/ContentAttributesByHash";
                    };
                    readonly contentMetadata: {
                        readonly $ref: "#/components/schemas/ContentMetadataByHash";
                    };
                    readonly hash: {
                        readonly type: "string";
                    };
                    readonly lastModified: {
                        readonly type: "number";
                        readonly format: "double";
                    };
                    readonly tags: {
                        readonly items: {
                            readonly type: "string";
                        };
                        readonly type: "array";
                    };
                    readonly eTag: {
                        readonly type: "string";
                    };
                    readonly sizeBytes: {
                        readonly type: "number";
                        readonly format: "double";
                    };
                    readonly mediaType: {
                        readonly $ref: "#/components/schemas/MediaType";
                    };
                    readonly mimeType: {
                        readonly type: "string";
                    };
                };
                readonly required: readonly ["createdAt", "updatedAt", "id", "objectKey", "folder", "contentAttributes", "contentMetadata", "lastModified", "tags", "eTag", "sizeBytes", "mediaType", "mimeType"];
                readonly type: "object";
                readonly additionalProperties: false;
            };
            readonly EntityDTO_any_: {
                readonly properties: {};
                readonly type: "object";
            };
            readonly FolderOperationName: {
                readonly enum: readonly ["IndexFolder", "IndexFolderObject", "TranscribeAudio", "DetectObjects"];
                readonly type: "string";
            };
            readonly FolderOperationRequestPayload: {
                readonly properties: {
                    readonly operationName: {
                        readonly $ref: "#/components/schemas/FolderOperationName";
                    };
                    readonly operationData: {
                        readonly properties: {};
                        readonly additionalProperties: {};
                        readonly type: "object";
                    };
                };
                readonly required: readonly ["operationName", "operationData"];
                readonly type: "object";
                readonly additionalProperties: false;
            };
            readonly FolderShareConfig: {
                readonly properties: {
                    readonly permissions: {
                        readonly items: {
                            readonly $ref: "#/components/schemas/FolderPermissionName";
                        };
                        readonly type: "array";
                    };
                };
                readonly required: readonly ["permissions"];
                readonly type: "object";
                readonly additionalProperties: false;
            };
            readonly FolderShareData: {
                readonly properties: {
                    readonly createdAt: {
                        readonly type: "string";
                        readonly format: "date-time";
                    };
                    readonly updatedAt: {
                        readonly type: "string";
                        readonly format: "date-time";
                    };
                    readonly id: {
                        readonly type: "string";
                    };
                    readonly userId: {
                        readonly type: "string";
                    };
                    readonly userLabel: {
                        readonly type: "string";
                    };
                    readonly userInviteEmail: {
                        readonly type: "string";
                    };
                    readonly folder: {
                        readonly properties: {
                            readonly id: {
                                readonly type: "string";
                            };
                        };
                        readonly required: readonly ["id"];
                        readonly type: "object";
                    };
                    readonly shareConfiguration: {
                        readonly $ref: "#/components/schemas/FolderShareConfig";
                    };
                };
                readonly required: readonly ["createdAt", "updatedAt", "id", "userLabel", "userInviteEmail", "folder", "shareConfiguration"];
                readonly type: "object";
                readonly additionalProperties: false;
            };
            readonly CreateFolderSharePayload: {
                readonly properties: {
                    readonly userInviteEmail: {
                        readonly type: "string";
                    };
                    readonly shareConfiguration: {
                        readonly $ref: "#/components/schemas/FolderShareConfig";
                    };
                };
                readonly required: readonly ["userInviteEmail", "shareConfiguration"];
                readonly type: "object";
                readonly additionalProperties: false;
            };
            readonly UpdateFolderSharePayload: {
                readonly properties: {
                    readonly shareConfiguration: {
                        readonly $ref: "#/components/schemas/FolderShareConfig";
                    };
                };
                readonly required: readonly ["shareConfiguration"];
                readonly type: "object";
                readonly additionalProperties: false;
            };
            readonly ObjectTagData: {
                readonly properties: {
                    readonly createdAt: {
                        readonly type: "string";
                        readonly format: "date-time";
                    };
                    readonly updatedAt: {
                        readonly type: "string";
                        readonly format: "date-time";
                    };
                    readonly id: {
                        readonly type: "string";
                    };
                    readonly name: {
                        readonly type: "string";
                    };
                };
                readonly required: readonly ["createdAt", "updatedAt", "id", "name"];
                readonly type: "object";
                readonly additionalProperties: false;
            };
            readonly SignedURLsRequestMethod: {
                readonly enum: readonly ["PUT", "DELETE", "GET"];
                readonly type: "string";
            };
            readonly SignedURLsRequest: {
                readonly properties: {
                    readonly objectIdentifier: {
                        readonly type: "string";
                    };
                    readonly method: {
                        readonly $ref: "#/components/schemas/SignedURLsRequestMethod";
                    };
                };
                readonly required: readonly ["objectIdentifier", "method"];
                readonly type: "object";
                readonly additionalProperties: false;
            };
            readonly FolderOperationData: {
                readonly properties: {
                    readonly createdAt: {
                        readonly type: "string";
                        readonly format: "date-time";
                    };
                    readonly updatedAt: {
                        readonly type: "string";
                        readonly format: "date-time";
                    };
                    readonly id: {
                        readonly type: "string";
                    };
                    readonly operationName: {
                        readonly $ref: "#/components/schemas/FolderOperationName";
                    };
                    readonly operationData: {
                        readonly properties: {};
                        readonly additionalProperties: {};
                        readonly type: "object";
                    };
                };
                readonly required: readonly ["createdAt", "updatedAt", "id", "operationName", "operationData"];
                readonly type: "object";
                readonly additionalProperties: false;
            };
            readonly FolderOperationsResponse: {
                readonly properties: {
                    readonly meta: {
                        readonly properties: {
                            readonly totalCount: {
                                readonly type: "number";
                                readonly format: "double";
                            };
                        };
                        readonly required: readonly ["totalCount"];
                        readonly type: "object";
                    };
                    readonly result: {
                        readonly items: {
                            readonly $ref: "#/components/schemas/FolderOperationData";
                        };
                        readonly type: "array";
                    };
                };
                readonly required: readonly ["meta", "result"];
                readonly type: "object";
                readonly additionalProperties: false;
            };
            readonly S3ConnectionData: {
                readonly properties: {
                    readonly createdAt: {
                        readonly type: "string";
                        readonly format: "date-time";
                    };
                    readonly updatedAt: {
                        readonly type: "string";
                        readonly format: "date-time";
                    };
                    readonly id: {
                        readonly type: "string";
                    };
                    readonly ownerId: {
                        readonly type: "string";
                    };
                    readonly name: {
                        readonly type: "string";
                    };
                    readonly accessKeyId: {
                        readonly type: "string";
                    };
                    readonly endpoint: {
                        readonly type: "string";
                    };
                    readonly region: {
                        readonly type: "string";
                    };
                };
                readonly required: readonly ["createdAt", "updatedAt", "id", "name", "accessKeyId", "endpoint"];
                readonly type: "object";
                readonly additionalProperties: false;
            };
        };
        readonly securitySchemes: {
            readonly RefreshToken: {
                readonly type: "apiKey";
                readonly in: "query";
                readonly name: "refresh_token";
            };
            readonly AccessToken: {
                readonly type: "http";
                readonly scheme: "bearer";
                readonly bearerFormat: "JWT";
            };
            readonly WorkerServiceToken: {
                readonly type: "http";
                readonly scheme: "bearer";
                readonly bearerFormat: "JWT";
            };
        };
    };
    readonly info: {
        readonly title: "@stellariscloud/api";
        readonly version: "1.0.0";
        readonly contact: {};
    };
    readonly openapi: "3.0.0";
    readonly paths: {
        readonly "/token": {
            readonly post: {
                readonly operationId: "refreshToken";
                readonly responses: {
                    readonly "200": {
                        readonly description: "Ok";
                        readonly content: {
                            readonly "application/json": {
                                readonly schema: {
                                    readonly $ref: "#/components/schemas/SessionResponse";
                                };
                            };
                        };
                    };
                    readonly "4XX": {
                        readonly description: "";
                        readonly content: {
                            readonly "application/json": {
                                readonly schema: {
                                    readonly $ref: "#/components/schemas/ErrorResponse";
                                };
                            };
                        };
                    };
                };
                readonly tags: readonly ["Auth"];
                readonly security: readonly [{
                    readonly RefreshToken: readonly [];
                }];
                readonly parameters: readonly [];
            };
        };
        readonly "/signup": {
            readonly post: {
                readonly operationId: "Signup";
                readonly responses: {
                    readonly "201": {
                        readonly description: "";
                        readonly content: {
                            readonly "application/json": {
                                readonly schema: {
                                    readonly properties: {
                                        readonly data: {
                                            readonly $ref: "#/components/schemas/User";
                                        };
                                    };
                                    readonly required: readonly ["data"];
                                    readonly type: "object";
                                };
                            };
                        };
                    };
                };
                readonly description: "Given a user's credentials, this endpoint will create a new user.";
                readonly tags: readonly ["Auth"];
                readonly security: readonly [];
                readonly parameters: readonly [];
                readonly requestBody: {
                    readonly required: true;
                    readonly content: {
                        readonly "application/json": {
                            readonly schema: {
                                readonly properties: {
                                    readonly data: {
                                        readonly $ref: "#/components/schemas/SignupParams";
                                    };
                                };
                                readonly required: readonly ["data"];
                                readonly type: "object";
                            };
                        };
                    };
                };
            };
        };
        readonly "/login": {
            readonly post: {
                readonly operationId: "Login";
                readonly responses: {
                    readonly "200": {
                        readonly description: "Ok";
                        readonly content: {
                            readonly "application/json": {
                                readonly schema: {
                                    readonly $ref: "#/components/schemas/SessionResponse";
                                };
                            };
                        };
                    };
                    readonly "4XX": {
                        readonly description: "";
                        readonly content: {
                            readonly "application/json": {
                                readonly schema: {
                                    readonly $ref: "#/components/schemas/ErrorResponse";
                                };
                            };
                        };
                    };
                };
                readonly tags: readonly ["Auth"];
                readonly security: readonly [{
                    readonly Public: readonly [];
                }];
                readonly parameters: readonly [];
                readonly requestBody: {
                    readonly required: true;
                    readonly content: {
                        readonly "application/json": {
                            readonly schema: {
                                readonly $ref: "#/components/schemas/LoginParams";
                            };
                        };
                    };
                };
            };
        };
        readonly "/logout": {
            readonly get: {
                readonly operationId: "logout";
                readonly responses: {
                    readonly "204": {
                        readonly description: "";
                    };
                    readonly "4XX": {
                        readonly description: "";
                        readonly content: {
                            readonly "application/json": {
                                readonly schema: {
                                    readonly $ref: "#/components/schemas/ErrorResponse";
                                };
                            };
                        };
                    };
                };
                readonly tags: readonly ["Auth"];
                readonly security: readonly [{
                    readonly AccessToken: readonly [];
                }];
                readonly parameters: readonly [];
            };
        };
        readonly "/worker/{operationId}/start": {
            readonly get: {
                readonly operationId: "startJob";
                readonly responses: {
                    readonly "200": {
                        readonly description: "Ok";
                        readonly content: {
                            readonly "application/json": {
                                readonly schema: {
                                    readonly items: {
                                        readonly properties: {
                                            readonly url: {
                                                readonly type: "string";
                                            };
                                            readonly objectKey: {
                                                readonly type: "string";
                                            };
                                            readonly folderId: {
                                                readonly type: "string";
                                            };
                                        };
                                        readonly required: readonly ["url", "objectKey", "folderId"];
                                        readonly type: "object";
                                    };
                                    readonly type: "array";
                                };
                            };
                        };
                    };
                    readonly "4XX": {
                        readonly description: "";
                        readonly content: {
                            readonly "application/json": {
                                readonly schema: {
                                    readonly $ref: "#/components/schemas/ErrorResponse";
                                };
                            };
                        };
                    };
                };
                readonly tags: readonly ["Worker"];
                readonly security: readonly [{
                    readonly WorkerServiceToken: readonly [];
                }];
                readonly parameters: readonly [{
                    readonly in: "path";
                    readonly name: "operationId";
                    readonly required: true;
                    readonly schema: {
                        readonly type: "string";
                    };
                }];
            };
        };
        readonly "/worker/{operationId}/complete": {
            readonly post: {
                readonly operationId: "completeJob";
                readonly responses: {
                    readonly "204": {
                        readonly description: "No content";
                    };
                    readonly "4XX": {
                        readonly description: "";
                        readonly content: {
                            readonly "application/json": {
                                readonly schema: {
                                    readonly $ref: "#/components/schemas/ErrorResponse";
                                };
                            };
                        };
                    };
                };
                readonly tags: readonly ["Worker"];
                readonly security: readonly [{
                    readonly WorkerServiceToken: readonly [];
                }];
                readonly parameters: readonly [{
                    readonly in: "path";
                    readonly name: "operationId";
                    readonly required: true;
                    readonly schema: {
                        readonly type: "string";
                    };
                }];
            };
        };
        readonly "/worker/{operationId}/output-upload-urls": {
            readonly post: {
                readonly operationId: "createOutputUploadUrls";
                readonly responses: {
                    readonly "200": {
                        readonly description: "Ok";
                        readonly content: {
                            readonly "application/json": {
                                readonly schema: {
                                    readonly properties: {
                                        readonly outputUploadUrls: {
                                            readonly items: {
                                                readonly $ref: "#/components/schemas/OutputUploadUrlsResponse";
                                            };
                                            readonly type: "array";
                                        };
                                    };
                                    readonly required: readonly ["outputUploadUrls"];
                                    readonly type: "object";
                                };
                            };
                        };
                    };
                    readonly "4XX": {
                        readonly description: "";
                        readonly content: {
                            readonly "application/json": {
                                readonly schema: {
                                    readonly $ref: "#/components/schemas/ErrorResponse";
                                };
                            };
                        };
                    };
                };
                readonly tags: readonly ["Worker"];
                readonly security: readonly [{
                    readonly WorkerServiceToken: readonly [];
                }];
                readonly parameters: readonly [{
                    readonly in: "path";
                    readonly name: "operationId";
                    readonly required: true;
                    readonly schema: {
                        readonly type: "string";
                    };
                }];
                readonly requestBody: {
                    readonly required: true;
                    readonly content: {
                        readonly "application/json": {
                            readonly schema: {
                                readonly $ref: "#/components/schemas/CreateOutputUploadUrlsPayload";
                            };
                        };
                    };
                };
            };
        };
        readonly "/worker/{operationId}/metadata-upload-urls": {
            readonly post: {
                readonly operationId: "createMetadataUploadUrls";
                readonly responses: {
                    readonly "200": {
                        readonly description: "Ok";
                        readonly content: {
                            readonly "application/json": {
                                readonly schema: {
                                    readonly properties: {
                                        readonly metadataUploadUrls: {
                                            readonly items: {
                                                readonly $ref: "#/components/schemas/MetadataUploadUrlsResponse";
                                            };
                                            readonly type: "array";
                                        };
                                    };
                                    readonly required: readonly ["metadataUploadUrls"];
                                    readonly type: "object";
                                };
                            };
                        };
                    };
                    readonly "4XX": {
                        readonly description: "";
                        readonly content: {
                            readonly "application/json": {
                                readonly schema: {
                                    readonly $ref: "#/components/schemas/ErrorResponse";
                                };
                            };
                        };
                    };
                };
                readonly tags: readonly ["Worker"];
                readonly security: readonly [{
                    readonly WorkerServiceToken: readonly [];
                }];
                readonly parameters: readonly [{
                    readonly in: "path";
                    readonly name: "operationId";
                    readonly required: true;
                    readonly schema: {
                        readonly type: "string";
                    };
                }];
                readonly requestBody: {
                    readonly required: true;
                    readonly content: {
                        readonly "application/json": {
                            readonly schema: {
                                readonly $ref: "#/components/schemas/CreateMetadataUploadUrlsPayload";
                            };
                        };
                    };
                };
            };
        };
        readonly "/worker/content-attributes": {
            readonly post: {
                readonly operationId: "updateContentAttributes";
                readonly responses: {
                    readonly "204": {
                        readonly description: "No content";
                    };
                    readonly "4XX": {
                        readonly description: "";
                        readonly content: {
                            readonly "application/json": {
                                readonly schema: {
                                    readonly $ref: "#/components/schemas/ErrorResponse";
                                };
                            };
                        };
                    };
                };
                readonly tags: readonly ["Worker"];
                readonly security: readonly [{
                    readonly WorkerServiceToken: readonly [];
                }];
                readonly parameters: readonly [];
                readonly requestBody: {
                    readonly required: true;
                    readonly content: {
                        readonly "application/json": {
                            readonly schema: {
                                readonly items: {
                                    readonly $ref: "#/components/schemas/ContentAttibutesPayload";
                                };
                                readonly type: "array";
                            };
                        };
                    };
                };
            };
        };
        readonly "/worker/content-metadata": {
            readonly post: {
                readonly operationId: "updateContentMetadata";
                readonly responses: {
                    readonly "204": {
                        readonly description: "No content";
                    };
                    readonly "4XX": {
                        readonly description: "";
                        readonly content: {
                            readonly "application/json": {
                                readonly schema: {
                                    readonly $ref: "#/components/schemas/ErrorResponse";
                                };
                            };
                        };
                    };
                };
                readonly tags: readonly ["Worker"];
                readonly security: readonly [{
                    readonly WorkerServiceToken: readonly [];
                }];
                readonly parameters: readonly [];
                readonly requestBody: {
                    readonly required: true;
                    readonly content: {
                        readonly "application/json": {
                            readonly schema: {
                                readonly items: {
                                    readonly $ref: "#/components/schemas/ContentMetadataPayload";
                                };
                                readonly type: "array";
                            };
                        };
                    };
                };
            };
        };
        readonly "/folders": {
            readonly post: {
                readonly operationId: "createFolder";
                readonly responses: {
                    readonly "200": {
                        readonly description: "Ok";
                        readonly content: {
                            readonly "application/json": {
                                readonly schema: {
                                    readonly properties: {
                                        readonly folder: {
                                            readonly $ref: "#/components/schemas/FolderData";
                                        };
                                    };
                                    readonly required: readonly ["folder"];
                                    readonly type: "object";
                                };
                            };
                        };
                    };
                    readonly "4XX": {
                        readonly description: "";
                        readonly content: {
                            readonly "application/json": {
                                readonly schema: {
                                    readonly $ref: "#/components/schemas/ErrorResponse";
                                };
                            };
                        };
                    };
                };
                readonly tags: readonly ["Folders"];
                readonly security: readonly [{
                    readonly AccessToken: readonly [];
                }];
                readonly parameters: readonly [];
                readonly requestBody: {
                    readonly required: true;
                    readonly content: {
                        readonly "application/json": {
                            readonly schema: {
                                readonly properties: {
                                    readonly prefix: {
                                        readonly type: "string";
                                    };
                                    readonly bucket: {
                                        readonly type: "string";
                                    };
                                    readonly name: {
                                        readonly type: "string";
                                    };
                                    readonly s3ConnectionId: {
                                        readonly type: "string";
                                    };
                                };
                                readonly required: readonly ["bucket", "name", "s3ConnectionId"];
                                readonly type: "object";
                            };
                        };
                    };
                };
            };
            readonly get: {
                readonly operationId: "listFolders";
                readonly responses: {
                    readonly "200": {
                        readonly description: "Ok";
                        readonly content: {
                            readonly "application/json": {
                                readonly schema: {
                                    readonly $ref: "#/components/schemas/ListFoldersResponse";
                                };
                            };
                        };
                    };
                    readonly "4XX": {
                        readonly description: "";
                        readonly content: {
                            readonly "application/json": {
                                readonly schema: {
                                    readonly $ref: "#/components/schemas/ErrorResponse";
                                };
                            };
                        };
                    };
                };
                readonly tags: readonly ["Folders"];
                readonly security: readonly [{
                    readonly AccessToken: readonly [];
                }];
                readonly parameters: readonly [];
            };
        };
        readonly "/folders/{folderId}": {
            readonly get: {
                readonly operationId: "getFolder";
                readonly responses: {
                    readonly "200": {
                        readonly description: "Ok";
                        readonly content: {
                            readonly "application/json": {
                                readonly schema: {
                                    readonly properties: {
                                        readonly permissions: {
                                            readonly items: {
                                                readonly $ref: "#/components/schemas/FolderPermissionName";
                                            };
                                            readonly type: "array";
                                        };
                                        readonly folder: {
                                            readonly $ref: "#/components/schemas/FolderData";
                                        };
                                    };
                                    readonly required: readonly ["permissions", "folder"];
                                    readonly type: "object";
                                };
                            };
                        };
                    };
                    readonly "4XX": {
                        readonly description: "";
                        readonly content: {
                            readonly "application/json": {
                                readonly schema: {
                                    readonly $ref: "#/components/schemas/ErrorResponse";
                                };
                            };
                        };
                    };
                };
                readonly tags: readonly ["Folders"];
                readonly security: readonly [{
                    readonly AccessToken: readonly [];
                }];
                readonly parameters: readonly [{
                    readonly in: "path";
                    readonly name: "folderId";
                    readonly required: true;
                    readonly schema: {
                        readonly type: "string";
                    };
                }];
            };
            readonly delete: {
                readonly operationId: "deleteFolder";
                readonly responses: {
                    readonly "200": {
                        readonly description: "Ok";
                        readonly content: {
                            readonly "application/json": {
                                readonly schema: {
                                    readonly properties: {
                                        readonly success: {
                                            readonly type: "boolean";
                                        };
                                    };
                                    readonly required: readonly ["success"];
                                    readonly type: "object";
                                };
                            };
                        };
                    };
                    readonly "4XX": {
                        readonly description: "";
                        readonly content: {
                            readonly "application/json": {
                                readonly schema: {
                                    readonly $ref: "#/components/schemas/ErrorResponse";
                                };
                            };
                        };
                    };
                };
                readonly tags: readonly ["Folders"];
                readonly security: readonly [{
                    readonly AccessToken: readonly [];
                }];
                readonly parameters: readonly [{
                    readonly in: "path";
                    readonly name: "folderId";
                    readonly required: true;
                    readonly schema: {
                        readonly type: "string";
                    };
                }];
            };
        };
        readonly "/folders/{folderId}/metadata": {
            readonly get: {
                readonly operationId: "getFolderMetadata";
                readonly responses: {
                    readonly "200": {
                        readonly description: "Ok";
                        readonly content: {
                            readonly "application/json": {
                                readonly schema: {
                                    readonly properties: {
                                        readonly totalSizeBytes: {
                                            readonly type: "number";
                                            readonly format: "double";
                                        };
                                        readonly totalCount: {
                                            readonly type: "number";
                                            readonly format: "double";
                                        };
                                    };
                                    readonly required: readonly ["totalSizeBytes", "totalCount"];
                                    readonly type: "object";
                                };
                            };
                        };
                    };
                    readonly "4XX": {
                        readonly description: "";
                        readonly content: {
                            readonly "application/json": {
                                readonly schema: {
                                    readonly $ref: "#/components/schemas/ErrorResponse";
                                };
                            };
                        };
                    };
                };
                readonly tags: readonly ["Folders"];
                readonly security: readonly [{
                    readonly AccessToken: readonly [];
                }];
                readonly parameters: readonly [{
                    readonly in: "path";
                    readonly name: "folderId";
                    readonly required: true;
                    readonly schema: {
                        readonly type: "string";
                    };
                }];
            };
        };
        readonly "/folders/{folderId}/objects/{objectKey}": {
            readonly get: {
                readonly operationId: "getFolderObject";
                readonly responses: {
                    readonly "200": {
                        readonly description: "Ok";
                        readonly content: {
                            readonly "application/json": {
                                readonly schema: {
                                    readonly $ref: "#/components/schemas/FolderObjectData";
                                };
                            };
                        };
                    };
                    readonly "4XX": {
                        readonly description: "";
                        readonly content: {
                            readonly "application/json": {
                                readonly schema: {
                                    readonly $ref: "#/components/schemas/ErrorResponse";
                                };
                            };
                        };
                    };
                };
                readonly tags: readonly ["Folders"];
                readonly security: readonly [{
                    readonly AccessToken: readonly [];
                }];
                readonly parameters: readonly [{
                    readonly in: "path";
                    readonly name: "folderId";
                    readonly required: true;
                    readonly schema: {
                        readonly type: "string";
                    };
                }, {
                    readonly in: "path";
                    readonly name: "objectKey";
                    readonly required: true;
                    readonly schema: {
                        readonly type: "string";
                    };
                }];
            };
            readonly delete: {
                readonly operationId: "deleteFolderObject";
                readonly responses: {
                    readonly "200": {
                        readonly description: "Ok";
                        readonly content: {
                            readonly "application/json": {
                                readonly schema: {
                                    readonly properties: {
                                        readonly success: {
                                            readonly type: "boolean";
                                        };
                                    };
                                    readonly required: readonly ["success"];
                                    readonly type: "object";
                                };
                            };
                        };
                    };
                    readonly "4XX": {
                        readonly description: "";
                        readonly content: {
                            readonly "application/json": {
                                readonly schema: {
                                    readonly $ref: "#/components/schemas/ErrorResponse";
                                };
                            };
                        };
                    };
                };
                readonly tags: readonly ["Folders"];
                readonly security: readonly [{
                    readonly AccessToken: readonly [];
                }];
                readonly parameters: readonly [{
                    readonly in: "path";
                    readonly name: "folderId";
                    readonly required: true;
                    readonly schema: {
                        readonly type: "string";
                    };
                }, {
                    readonly in: "path";
                    readonly name: "objectKey";
                    readonly required: true;
                    readonly schema: {
                        readonly type: "string";
                    };
                }];
            };
            readonly put: {
                readonly operationId: "refreshFolderObjectS3Metadata";
                readonly responses: {
                    readonly "200": {
                        readonly description: "Ok";
                        readonly content: {
                            readonly "application/json": {
                                readonly schema: {
                                    readonly $ref: "#/components/schemas/FolderObjectData";
                                };
                            };
                        };
                    };
                    readonly "4XX": {
                        readonly description: "";
                        readonly content: {
                            readonly "application/json": {
                                readonly schema: {
                                    readonly $ref: "#/components/schemas/ErrorResponse";
                                };
                            };
                        };
                    };
                };
                readonly tags: readonly ["Folders"];
                readonly security: readonly [{
                    readonly AccessToken: readonly [];
                }];
                readonly parameters: readonly [{
                    readonly in: "path";
                    readonly name: "folderId";
                    readonly required: true;
                    readonly schema: {
                        readonly type: "string";
                    };
                }, {
                    readonly in: "path";
                    readonly name: "objectKey";
                    readonly required: true;
                    readonly schema: {
                        readonly type: "string";
                    };
                }];
                readonly requestBody: {
                    readonly required: true;
                    readonly content: {
                        readonly "application/json": {
                            readonly schema: {
                                readonly properties: {
                                    readonly eTag: {
                                        readonly type: "string";
                                    };
                                };
                                readonly type: "object";
                            };
                        };
                    };
                };
            };
        };
        readonly "/folders/{folderId}/objects/{objectKey}/operations": {
            readonly post: {
                readonly operationId: "enqueueFolderOperation";
                readonly responses: {
                    readonly "200": {
                        readonly description: "Ok";
                        readonly content: {
                            readonly "application/json": {
                                readonly schema: {
                                    readonly $ref: "#/components/schemas/EntityDTO_any_";
                                };
                            };
                        };
                    };
                    readonly "4XX": {
                        readonly description: "";
                        readonly content: {
                            readonly "application/json": {
                                readonly schema: {
                                    readonly $ref: "#/components/schemas/ErrorResponse";
                                };
                            };
                        };
                    };
                };
                readonly tags: readonly ["Folders"];
                readonly security: readonly [{
                    readonly AccessToken: readonly [];
                }];
                readonly parameters: readonly [{
                    readonly in: "path";
                    readonly name: "folderId";
                    readonly required: true;
                    readonly schema: {
                        readonly type: "string";
                    };
                }];
                readonly requestBody: {
                    readonly required: true;
                    readonly content: {
                        readonly "application/json": {
                            readonly schema: {
                                readonly $ref: "#/components/schemas/FolderOperationRequestPayload";
                            };
                        };
                    };
                };
            };
        };
        readonly "/folders/{folderId}/objects": {
            readonly get: {
                readonly operationId: "listFolderObjects";
                readonly responses: {
                    readonly "200": {
                        readonly description: "Ok";
                        readonly content: {
                            readonly "application/json": {
                                readonly schema: {
                                    readonly properties: {
                                        readonly meta: {
                                            readonly properties: {
                                                readonly totalCount: {
                                                    readonly type: "number";
                                                    readonly format: "double";
                                                };
                                            };
                                            readonly required: readonly ["totalCount"];
                                            readonly type: "object";
                                        };
                                        readonly result: {
                                            readonly items: {
                                                readonly $ref: "#/components/schemas/FolderObjectData";
                                            };
                                            readonly type: "array";
                                        };
                                    };
                                    readonly required: readonly ["meta", "result"];
                                    readonly type: "object";
                                };
                            };
                        };
                    };
                    readonly "4XX": {
                        readonly description: "";
                        readonly content: {
                            readonly "application/json": {
                                readonly schema: {
                                    readonly $ref: "#/components/schemas/ErrorResponse";
                                };
                            };
                        };
                    };
                };
                readonly tags: readonly ["Folders"];
                readonly security: readonly [{
                    readonly AccessToken: readonly [];
                }];
                readonly parameters: readonly [{
                    readonly in: "path";
                    readonly name: "folderId";
                    readonly required: true;
                    readonly schema: {
                        readonly type: "string";
                    };
                }, {
                    readonly in: "query";
                    readonly name: "search";
                    readonly required: false;
                    readonly schema: {
                        readonly type: "string";
                    };
                }, {
                    readonly in: "query";
                    readonly name: "tagId";
                    readonly required: false;
                    readonly schema: {
                        readonly type: "string";
                    };
                }, {
                    readonly in: "query";
                    readonly name: "offset";
                    readonly required: false;
                    readonly schema: {
                        readonly format: "double";
                        readonly type: "number";
                    };
                }, {
                    readonly in: "query";
                    readonly name: "limit";
                    readonly required: false;
                    readonly schema: {
                        readonly format: "double";
                        readonly type: "number";
                    };
                }];
            };
        };
        readonly "/folders/{folderId}/shares": {
            readonly post: {
                readonly operationId: "createFolderShare";
                readonly responses: {
                    readonly "200": {
                        readonly description: "Ok";
                        readonly content: {
                            readonly "application/json": {
                                readonly schema: {
                                    readonly $ref: "#/components/schemas/FolderShareData";
                                };
                            };
                        };
                    };
                    readonly "4XX": {
                        readonly description: "";
                        readonly content: {
                            readonly "application/json": {
                                readonly schema: {
                                    readonly $ref: "#/components/schemas/ErrorResponse";
                                };
                            };
                        };
                    };
                };
                readonly tags: readonly ["Folders"];
                readonly security: readonly [{
                    readonly AccessToken: readonly [];
                }];
                readonly parameters: readonly [{
                    readonly in: "path";
                    readonly name: "folderId";
                    readonly required: true;
                    readonly schema: {
                        readonly type: "string";
                    };
                }];
                readonly requestBody: {
                    readonly required: true;
                    readonly content: {
                        readonly "application/json": {
                            readonly schema: {
                                readonly $ref: "#/components/schemas/CreateFolderSharePayload";
                            };
                        };
                    };
                };
            };
            readonly get: {
                readonly operationId: "listFolderShares";
                readonly responses: {
                    readonly "200": {
                        readonly description: "Ok";
                        readonly content: {
                            readonly "application/json": {
                                readonly schema: {
                                    readonly properties: {
                                        readonly meta: {
                                            readonly properties: {
                                                readonly totalCount: {
                                                    readonly type: "number";
                                                    readonly format: "double";
                                                };
                                            };
                                            readonly required: readonly ["totalCount"];
                                            readonly type: "object";
                                        };
                                        readonly result: {
                                            readonly items: {
                                                readonly $ref: "#/components/schemas/FolderShareData";
                                            };
                                            readonly type: "array";
                                        };
                                    };
                                    readonly required: readonly ["meta", "result"];
                                    readonly type: "object";
                                };
                            };
                        };
                    };
                    readonly "4XX": {
                        readonly description: "";
                        readonly content: {
                            readonly "application/json": {
                                readonly schema: {
                                    readonly $ref: "#/components/schemas/ErrorResponse";
                                };
                            };
                        };
                    };
                };
                readonly tags: readonly ["Folders"];
                readonly security: readonly [{
                    readonly AccessToken: readonly [];
                }];
                readonly parameters: readonly [{
                    readonly in: "path";
                    readonly name: "folderId";
                    readonly required: true;
                    readonly schema: {
                        readonly type: "string";
                    };
                }];
            };
        };
        readonly "/folders/{folderId}/shares/{shareId}": {
            readonly delete: {
                readonly operationId: "deleteFolderShare";
                readonly responses: {
                    readonly "200": {
                        readonly description: "Ok";
                        readonly content: {
                            readonly "application/json": {
                                readonly schema: {
                                    readonly properties: {
                                        readonly success: {
                                            readonly type: "boolean";
                                        };
                                    };
                                    readonly required: readonly ["success"];
                                    readonly type: "object";
                                };
                            };
                        };
                    };
                    readonly "4XX": {
                        readonly description: "";
                        readonly content: {
                            readonly "application/json": {
                                readonly schema: {
                                    readonly $ref: "#/components/schemas/ErrorResponse";
                                };
                            };
                        };
                    };
                };
                readonly tags: readonly ["Folders"];
                readonly security: readonly [{
                    readonly AccessToken: readonly [];
                }];
                readonly parameters: readonly [{
                    readonly in: "path";
                    readonly name: "folderId";
                    readonly required: true;
                    readonly schema: {
                        readonly type: "string";
                    };
                }, {
                    readonly in: "path";
                    readonly name: "shareId";
                    readonly required: true;
                    readonly schema: {
                        readonly type: "string";
                    };
                }];
            };
            readonly put: {
                readonly operationId: "updateFolderShare";
                readonly responses: {
                    readonly "200": {
                        readonly description: "Ok";
                        readonly content: {
                            readonly "application/json": {
                                readonly schema: {
                                    readonly $ref: "#/components/schemas/FolderShareData";
                                };
                            };
                        };
                    };
                    readonly "4XX": {
                        readonly description: "";
                        readonly content: {
                            readonly "application/json": {
                                readonly schema: {
                                    readonly $ref: "#/components/schemas/ErrorResponse";
                                };
                            };
                        };
                    };
                };
                readonly tags: readonly ["Folders"];
                readonly security: readonly [{
                    readonly AccessToken: readonly [];
                }];
                readonly parameters: readonly [{
                    readonly in: "path";
                    readonly name: "folderId";
                    readonly required: true;
                    readonly schema: {
                        readonly type: "string";
                    };
                }, {
                    readonly in: "path";
                    readonly name: "shareId";
                    readonly required: true;
                    readonly schema: {
                        readonly type: "string";
                    };
                }];
                readonly requestBody: {
                    readonly required: true;
                    readonly content: {
                        readonly "application/json": {
                            readonly schema: {
                                readonly $ref: "#/components/schemas/UpdateFolderSharePayload";
                            };
                        };
                    };
                };
            };
        };
        readonly "/folders/{folderId}/tags": {
            readonly get: {
                readonly operationId: "listTags";
                readonly responses: {
                    readonly "200": {
                        readonly description: "Ok";
                        readonly content: {
                            readonly "application/json": {
                                readonly schema: {
                                    readonly properties: {
                                        readonly meta: {
                                            readonly properties: {
                                                readonly totalCount: {
                                                    readonly type: "number";
                                                    readonly format: "double";
                                                };
                                            };
                                            readonly required: readonly ["totalCount"];
                                            readonly type: "object";
                                        };
                                        readonly result: {
                                            readonly items: {
                                                readonly $ref: "#/components/schemas/ObjectTagData";
                                            };
                                            readonly type: "array";
                                        };
                                    };
                                    readonly required: readonly ["meta", "result"];
                                    readonly type: "object";
                                };
                            };
                        };
                    };
                    readonly "4XX": {
                        readonly description: "";
                        readonly content: {
                            readonly "application/json": {
                                readonly schema: {
                                    readonly $ref: "#/components/schemas/ErrorResponse";
                                };
                            };
                        };
                    };
                };
                readonly tags: readonly ["Folders"];
                readonly security: readonly [{
                    readonly AccessToken: readonly [];
                }];
                readonly parameters: readonly [{
                    readonly in: "path";
                    readonly name: "folderId";
                    readonly required: true;
                    readonly schema: {
                        readonly type: "string";
                    };
                }];
            };
            readonly post: {
                readonly operationId: "createTag";
                readonly responses: {
                    readonly "200": {
                        readonly description: "Ok";
                        readonly content: {
                            readonly "application/json": {
                                readonly schema: {
                                    readonly $ref: "#/components/schemas/ObjectTagData";
                                };
                            };
                        };
                    };
                    readonly "4XX": {
                        readonly description: "";
                        readonly content: {
                            readonly "application/json": {
                                readonly schema: {
                                    readonly $ref: "#/components/schemas/ErrorResponse";
                                };
                            };
                        };
                    };
                };
                readonly tags: readonly ["Folders"];
                readonly security: readonly [{
                    readonly AccessToken: readonly [];
                }];
                readonly parameters: readonly [{
                    readonly in: "path";
                    readonly name: "folderId";
                    readonly required: true;
                    readonly schema: {
                        readonly type: "string";
                    };
                }];
                readonly requestBody: {
                    readonly required: true;
                    readonly content: {
                        readonly "application/json": {
                            readonly schema: {
                                readonly properties: {
                                    readonly name: {
                                        readonly type: "string";
                                    };
                                };
                                readonly required: readonly ["name"];
                                readonly type: "object";
                            };
                        };
                    };
                };
            };
        };
        readonly "/folders/{folderId}/tags/{tagId}": {
            readonly post: {
                readonly operationId: "updateTag";
                readonly responses: {
                    readonly "200": {
                        readonly description: "Ok";
                        readonly content: {
                            readonly "application/json": {
                                readonly schema: {
                                    readonly $ref: "#/components/schemas/ObjectTagData";
                                };
                            };
                        };
                    };
                    readonly "4XX": {
                        readonly description: "";
                        readonly content: {
                            readonly "application/json": {
                                readonly schema: {
                                    readonly $ref: "#/components/schemas/ErrorResponse";
                                };
                            };
                        };
                    };
                };
                readonly tags: readonly ["Folders"];
                readonly security: readonly [{
                    readonly AccessToken: readonly [];
                }];
                readonly parameters: readonly [{
                    readonly in: "path";
                    readonly name: "folderId";
                    readonly required: true;
                    readonly schema: {
                        readonly type: "string";
                    };
                }, {
                    readonly in: "path";
                    readonly name: "tagId";
                    readonly required: true;
                    readonly schema: {
                        readonly type: "string";
                    };
                }];
                readonly requestBody: {
                    readonly required: true;
                    readonly content: {
                        readonly "application/json": {
                            readonly schema: {
                                readonly properties: {
                                    readonly name: {
                                        readonly type: "string";
                                    };
                                };
                                readonly required: readonly ["name"];
                                readonly type: "object";
                            };
                        };
                    };
                };
            };
            readonly delete: {
                readonly operationId: "deleteTag";
                readonly responses: {
                    readonly "200": {
                        readonly description: "Ok";
                        readonly content: {
                            readonly "application/json": {
                                readonly schema: {
                                    readonly properties: {
                                        readonly success: {
                                            readonly type: "boolean";
                                        };
                                    };
                                    readonly required: readonly ["success"];
                                    readonly type: "object";
                                };
                            };
                        };
                    };
                    readonly "4XX": {
                        readonly description: "";
                        readonly content: {
                            readonly "application/json": {
                                readonly schema: {
                                    readonly $ref: "#/components/schemas/ErrorResponse";
                                };
                            };
                        };
                    };
                };
                readonly tags: readonly ["Folders"];
                readonly security: readonly [{
                    readonly AccessToken: readonly [];
                }];
                readonly parameters: readonly [{
                    readonly in: "path";
                    readonly name: "folderId";
                    readonly required: true;
                    readonly schema: {
                        readonly type: "string";
                    };
                }, {
                    readonly in: "path";
                    readonly name: "tagId";
                    readonly required: true;
                    readonly schema: {
                        readonly type: "string";
                    };
                }];
            };
        };
        readonly "/folders/{folderId}/objects/{objectKey}/{tagId}": {
            readonly post: {
                readonly operationId: "tagObject";
                readonly responses: {
                    readonly "200": {
                        readonly description: "Ok";
                        readonly content: {
                            readonly "application/json": {
                                readonly schema: {
                                    readonly properties: {
                                        readonly success: {
                                            readonly type: "boolean";
                                        };
                                    };
                                    readonly required: readonly ["success"];
                                    readonly type: "object";
                                };
                            };
                        };
                    };
                    readonly "4XX": {
                        readonly description: "";
                        readonly content: {
                            readonly "application/json": {
                                readonly schema: {
                                    readonly $ref: "#/components/schemas/ErrorResponse";
                                };
                            };
                        };
                    };
                };
                readonly tags: readonly ["Folders"];
                readonly security: readonly [{
                    readonly AccessToken: readonly [];
                }];
                readonly parameters: readonly [{
                    readonly in: "path";
                    readonly name: "folderId";
                    readonly required: true;
                    readonly schema: {
                        readonly type: "string";
                    };
                }, {
                    readonly in: "path";
                    readonly name: "objectKey";
                    readonly required: true;
                    readonly schema: {
                        readonly type: "string";
                    };
                }, {
                    readonly in: "path";
                    readonly name: "tagId";
                    readonly required: true;
                    readonly schema: {
                        readonly type: "string";
                    };
                }];
            };
            readonly delete: {
                readonly operationId: "untagObject";
                readonly responses: {
                    readonly "200": {
                        readonly description: "Ok";
                        readonly content: {
                            readonly "application/json": {
                                readonly schema: {
                                    readonly properties: {
                                        readonly success: {
                                            readonly type: "boolean";
                                        };
                                    };
                                    readonly required: readonly ["success"];
                                    readonly type: "object";
                                };
                            };
                        };
                    };
                    readonly "4XX": {
                        readonly description: "";
                        readonly content: {
                            readonly "application/json": {
                                readonly schema: {
                                    readonly $ref: "#/components/schemas/ErrorResponse";
                                };
                            };
                        };
                    };
                };
                readonly tags: readonly ["Folders"];
                readonly security: readonly [{
                    readonly AccessToken: readonly [];
                }];
                readonly parameters: readonly [{
                    readonly in: "path";
                    readonly name: "folderId";
                    readonly required: true;
                    readonly schema: {
                        readonly type: "string";
                    };
                }, {
                    readonly in: "path";
                    readonly name: "objectKey";
                    readonly required: true;
                    readonly schema: {
                        readonly type: "string";
                    };
                }, {
                    readonly in: "path";
                    readonly name: "tagId";
                    readonly required: true;
                    readonly schema: {
                        readonly type: "string";
                    };
                }];
            };
        };
        readonly "/folders/{folderId}/refresh": {
            readonly post: {
                readonly operationId: "refreshFolder";
                readonly responses: {
                    readonly "200": {
                        readonly description: "Ok";
                        readonly content: {
                            readonly "application/json": {
                                readonly schema: {
                                    readonly type: "boolean";
                                };
                            };
                        };
                    };
                    readonly "4XX": {
                        readonly description: "";
                        readonly content: {
                            readonly "application/json": {
                                readonly schema: {
                                    readonly $ref: "#/components/schemas/ErrorResponse";
                                };
                            };
                        };
                    };
                };
                readonly tags: readonly ["Folders"];
                readonly security: readonly [{
                    readonly AccessToken: readonly [];
                }];
                readonly parameters: readonly [{
                    readonly in: "path";
                    readonly name: "folderId";
                    readonly required: true;
                    readonly schema: {
                        readonly type: "string";
                    };
                }];
            };
        };
        readonly "/folders/{folderId}/presigned-urls": {
            readonly post: {
                readonly operationId: "createPresignedUrls";
                readonly responses: {
                    readonly "200": {
                        readonly description: "Ok";
                        readonly content: {
                            readonly "application/json": {
                                readonly schema: {
                                    readonly items: {
                                        readonly type: "string";
                                    };
                                    readonly type: "array";
                                };
                            };
                        };
                    };
                    readonly "4XX": {
                        readonly description: "";
                        readonly content: {
                            readonly "application/json": {
                                readonly schema: {
                                    readonly $ref: "#/components/schemas/ErrorResponse";
                                };
                            };
                        };
                    };
                };
                readonly tags: readonly ["Folders"];
                readonly security: readonly [{
                    readonly AccessToken: readonly [];
                }];
                readonly parameters: readonly [{
                    readonly in: "path";
                    readonly name: "folderId";
                    readonly required: true;
                    readonly schema: {
                        readonly type: "string";
                    };
                }];
                readonly requestBody: {
                    readonly required: true;
                    readonly content: {
                        readonly "application/json": {
                            readonly schema: {
                                readonly items: {
                                    readonly $ref: "#/components/schemas/SignedURLsRequest";
                                };
                                readonly type: "array";
                            };
                        };
                    };
                };
            };
        };
        readonly "/folders/{folderId}/socket-auth": {
            readonly post: {
                readonly operationId: "createSocketAuthentication";
                readonly responses: {
                    readonly "200": {
                        readonly description: "Ok";
                        readonly content: {
                            readonly "application/json": {
                                readonly schema: {
                                    readonly properties: {
                                        readonly token: {
                                            readonly type: "string";
                                        };
                                    };
                                    readonly required: readonly ["token"];
                                    readonly type: "object";
                                };
                            };
                        };
                    };
                    readonly "4XX": {
                        readonly description: "";
                        readonly content: {
                            readonly "application/json": {
                                readonly schema: {
                                    readonly $ref: "#/components/schemas/ErrorResponse";
                                };
                            };
                        };
                    };
                };
                readonly tags: readonly ["Folders"];
                readonly security: readonly [{
                    readonly AccessToken: readonly [];
                }];
                readonly parameters: readonly [{
                    readonly in: "path";
                    readonly name: "folderId";
                    readonly required: true;
                    readonly schema: {
                        readonly type: "string";
                    };
                }];
            };
        };
        readonly "/folders/{folderId}/folder-operations": {
            readonly get: {
                readonly operationId: "listFolderOperations";
                readonly responses: {
                    readonly "200": {
                        readonly description: "Ok";
                        readonly content: {
                            readonly "application/json": {
                                readonly schema: {
                                    readonly $ref: "#/components/schemas/FolderOperationsResponse";
                                };
                            };
                        };
                    };
                    readonly "4XX": {
                        readonly description: "";
                        readonly content: {
                            readonly "application/json": {
                                readonly schema: {
                                    readonly $ref: "#/components/schemas/ErrorResponse";
                                };
                            };
                        };
                    };
                };
                readonly tags: readonly ["Folders"];
                readonly security: readonly [{
                    readonly AccessToken: readonly [];
                }];
                readonly parameters: readonly [{
                    readonly in: "path";
                    readonly name: "folderId";
                    readonly required: true;
                    readonly schema: {
                        readonly type: "string";
                    };
                }];
            };
        };
        readonly "/s3-connections/{s3ConnectionId}": {
            readonly get: {
                readonly operationId: "getS3Connection";
                readonly responses: {
                    readonly "200": {
                        readonly description: "Ok";
                        readonly content: {
                            readonly "application/json": {
                                readonly schema: {
                                    readonly $ref: "#/components/schemas/S3ConnectionData";
                                };
                            };
                        };
                    };
                    readonly "4XX": {
                        readonly description: "";
                        readonly content: {
                            readonly "application/json": {
                                readonly schema: {
                                    readonly $ref: "#/components/schemas/ErrorResponse";
                                };
                            };
                        };
                    };
                };
                readonly tags: readonly ["S3Connections"];
                readonly security: readonly [{
                    readonly AccessToken: readonly [];
                }];
                readonly parameters: readonly [{
                    readonly in: "path";
                    readonly name: "s3ConnectionId";
                    readonly required: true;
                    readonly schema: {
                        readonly type: "string";
                    };
                }];
            };
            readonly post: {
                readonly operationId: "deleteS3Connection";
                readonly responses: {
                    readonly "200": {
                        readonly description: "Ok";
                        readonly content: {
                            readonly "application/json": {
                                readonly schema: {
                                    readonly properties: {
                                        readonly success: {
                                            readonly type: "boolean";
                                        };
                                    };
                                    readonly required: readonly ["success"];
                                    readonly type: "object";
                                };
                            };
                        };
                    };
                    readonly "4XX": {
                        readonly description: "";
                        readonly content: {
                            readonly "application/json": {
                                readonly schema: {
                                    readonly $ref: "#/components/schemas/ErrorResponse";
                                };
                            };
                        };
                    };
                };
                readonly tags: readonly ["S3Connections"];
                readonly security: readonly [{
                    readonly AccessToken: readonly [];
                }];
                readonly parameters: readonly [{
                    readonly in: "path";
                    readonly name: "s3ConnectionId";
                    readonly required: true;
                    readonly schema: {
                        readonly type: "string";
                    };
                }];
            };
        };
        readonly "/s3-connections": {
            readonly get: {
                readonly operationId: "listS3Connections";
                readonly responses: {
                    readonly "200": {
                        readonly description: "Ok";
                        readonly content: {
                            readonly "application/json": {
                                readonly schema: {
                                    readonly properties: {
                                        readonly result: {
                                            readonly items: {
                                                readonly $ref: "#/components/schemas/S3ConnectionData";
                                            };
                                            readonly type: "array";
                                        };
                                        readonly meta: {
                                            readonly properties: {
                                                readonly totalCount: {
                                                    readonly type: "number";
                                                    readonly format: "double";
                                                };
                                            };
                                            readonly required: readonly ["totalCount"];
                                            readonly type: "object";
                                        };
                                    };
                                    readonly required: readonly ["result", "meta"];
                                    readonly type: "object";
                                };
                            };
                        };
                    };
                    readonly "4XX": {
                        readonly description: "";
                        readonly content: {
                            readonly "application/json": {
                                readonly schema: {
                                    readonly $ref: "#/components/schemas/ErrorResponse";
                                };
                            };
                        };
                    };
                };
                readonly tags: readonly ["S3Connections"];
                readonly security: readonly [{
                    readonly AccessToken: readonly [];
                }];
                readonly parameters: readonly [];
            };
            readonly post: {
                readonly operationId: "createS3Connection";
                readonly responses: {
                    readonly "200": {
                        readonly description: "Ok";
                        readonly content: {
                            readonly "application/json": {
                                readonly schema: {
                                    readonly $ref: "#/components/schemas/S3ConnectionData";
                                };
                            };
                        };
                    };
                    readonly "4XX": {
                        readonly description: "";
                        readonly content: {
                            readonly "application/json": {
                                readonly schema: {
                                    readonly $ref: "#/components/schemas/ErrorResponse";
                                };
                            };
                        };
                    };
                };
                readonly tags: readonly ["S3Connections"];
                readonly security: readonly [{
                    readonly AccessToken: readonly [];
                }];
                readonly parameters: readonly [];
                readonly requestBody: {
                    readonly required: true;
                    readonly content: {
                        readonly "application/json": {
                            readonly schema: {
                                readonly properties: {
                                    readonly region: {
                                        readonly type: "string";
                                    };
                                    readonly endpoint: {
                                        readonly type: "string";
                                    };
                                    readonly secretAccessKey: {
                                        readonly type: "string";
                                    };
                                    readonly accessKeyId: {
                                        readonly type: "string";
                                    };
                                    readonly name: {
                                        readonly type: "string";
                                    };
                                };
                                readonly required: readonly ["region", "endpoint", "secretAccessKey", "accessKeyId", "name"];
                                readonly type: "object";
                            };
                        };
                    };
                };
            };
        };
        readonly "/s3-connections/test": {
            readonly post: {
                readonly operationId: "testS3Connection";
                readonly responses: {
                    readonly "200": {
                        readonly description: "Ok";
                        readonly content: {
                            readonly "application/json": {
                                readonly schema: {
                                    readonly properties: {
                                        readonly success: {
                                            readonly type: "boolean";
                                        };
                                    };
                                    readonly required: readonly ["success"];
                                    readonly type: "object";
                                };
                            };
                        };
                    };
                    readonly "4XX": {
                        readonly description: "";
                        readonly content: {
                            readonly "application/json": {
                                readonly schema: {
                                    readonly $ref: "#/components/schemas/ErrorResponse";
                                };
                            };
                        };
                    };
                };
                readonly tags: readonly ["S3Connections"];
                readonly security: readonly [{
                    readonly AccessToken: readonly [];
                }];
                readonly parameters: readonly [];
                readonly requestBody: {
                    readonly required: true;
                    readonly content: {
                        readonly "application/json": {
                            readonly schema: {
                                readonly properties: {
                                    readonly region: {
                                        readonly type: "string";
                                    };
                                    readonly endpoint: {
                                        readonly type: "string";
                                    };
                                    readonly secretAccessKey: {
                                        readonly type: "string";
                                    };
                                    readonly accessKeyId: {
                                        readonly type: "string";
                                    };
                                    readonly name: {
                                        readonly type: "string";
                                    };
                                };
                                readonly required: readonly ["region", "endpoint", "secretAccessKey", "accessKeyId", "name"];
                                readonly type: "object";
                            };
                        };
                    };
                };
            };
        };
        readonly "/viewer": {
            readonly get: {
                readonly operationId: "getViewer";
                readonly responses: {
                    readonly "200": {
                        readonly description: "Ok";
                        readonly content: {
                            readonly "application/json": {
                                readonly schema: {
                                    readonly properties: {
                                        readonly data: {
                                            readonly $ref: "#/components/schemas/UserData";
                                        };
                                    };
                                    readonly required: readonly ["data"];
                                    readonly type: "object";
                                };
                            };
                        };
                    };
                };
                readonly tags: readonly ["Viewer"];
                readonly security: readonly [{
                    readonly AccessToken: readonly ["viewer:read"];
                }];
                readonly parameters: readonly [];
            };
        };
    };
    readonly servers: readonly [{
        readonly url: "http://localhost:3001/api/v1";
    }];
};
